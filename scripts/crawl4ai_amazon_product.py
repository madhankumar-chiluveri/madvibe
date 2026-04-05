import argparse
import asyncio
import json
import os
import re
import sys
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse

PROJECT_ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("PYTHONUTF8", "1")
os.environ.setdefault("CRAWL4_AI_BASE_DIRECTORY", str(PROJECT_ROOT))
os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", str(PROJECT_ROOT / ".playwright-browsers"))

from bs4 import BeautifulSoup  # noqa: E402
from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig  # noqa: E402


SPACE_RE = re.compile(r"\s+")
BLOCKED_IMAGE_TERMS = ("sprite", "icon", "logo", "spinner", "loading", "pixel")


def normalize_space(value: str | None) -> str:
    if not value:
        return ""
    return SPACE_RE.sub(" ", value).strip()


def unique(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []

    for value in values:
        cleaned = normalize_space(value)
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        ordered.append(cleaned)

    return ordered


def first_text(soup: BeautifulSoup, selectors: list[str]) -> str:
    for selector in selectors:
        node = soup.select_one(selector)
        if not node:
            continue
        text = normalize_space(node.get_text(" ", strip=True))
        if text:
            return text
    return ""


def first_attribute(soup: BeautifulSoup, selectors: list[str], attribute: str) -> str:
    for selector in selectors:
        node = soup.select_one(selector)
        if not node:
            continue
        value = normalize_space(node.get(attribute))
        if value:
            return value
    return ""


def extract_dynamic_images(node) -> list[str]:
    candidates: list[str] = []

    for attribute in ("data-old-hires", "src"):
        value = node.get(attribute)
        if isinstance(value, str) and value.strip():
            candidates.append(value.strip())

    dynamic_payload = node.get("data-a-dynamic-image")
    if isinstance(dynamic_payload, str) and dynamic_payload.strip():
        try:
            parsed = json.loads(dynamic_payload)
            if isinstance(parsed, dict):
                candidates.extend(str(url).strip() for url in parsed.keys())
        except json.JSONDecodeError:
            pass

    return candidates


def is_valid_image_url(value: str) -> bool:
    lowered = value.lower()
    return (
        value.startswith("http")
        and "amazon" in lowered
        and not any(term in lowered for term in BLOCKED_IMAGE_TERMS)
    )


def score_image_url(value: str) -> tuple[int, int]:
    lowered = value.lower()
    priority = 0
    if "data-old-hires" in lowered:
        priority += 4
    if "m.media-amazon.com/images/i" in lowered:
        priority += 3
    if "_sl1500_" in lowered or "_sl1000_" in lowered or "_ac_sl" in lowered:
        priority += 2
    return (priority, len(value))


def gather_images(soup: BeautifulSoup, media: dict | None) -> list[str]:
    candidates: list[str] = []

    for selector in (
        "#landingImage",
        "#imgBlkFront",
        "#ebooksImgBlkFront",
        ".a-dynamic-image",
        "#altImages img",
        "#imageBlock img",
    ):
        for node in soup.select(selector):
            candidates.extend(extract_dynamic_images(node))

    if isinstance(media, dict):
        for item in media.get("images", []):
            if not isinstance(item, dict):
                continue
            for key in ("src", "url", "data-src", "image_url"):
                value = item.get(key)
                if isinstance(value, str) and value.strip():
                    candidates.append(value.strip())

    filtered = unique(value for value in candidates if is_valid_image_url(value))
    return sorted(filtered, key=score_image_url, reverse=True)


def gather_features(soup: BeautifulSoup) -> list[str]:
    features = [
        normalize_space(node.get_text(" ", strip=True))
        for node in soup.select(
            "#feature-bullets ul li .a-list-item, #featurebullets_feature_div ul li span, #detailBullets_feature_div li span"
        )
    ]

    cleaned = []
    for feature in features:
        lowered = feature.lower()
        if (
            not feature
            or lowered.startswith("make sure this fits")
            or lowered.startswith("consider a similar item")
        ):
            continue
        cleaned.append(feature)

    return unique(cleaned)[:12]


def build_description(soup: BeautifulSoup, features: list[str]) -> str:
    description_parts = [
        first_text(
            soup,
            [
                "#productDescription",
                "#bookDescription_feature_div",
                "#feature-bullets",
                "#aplus_feature_div",
            ],
        )
    ]

    if not description_parts[0] and features:
        description_parts.append(" ".join(features[:5]))

    return normalize_space(" ".join(part for part in description_parts if part))


def extract_title(soup: BeautifulSoup) -> str:
    title = first_text(soup, ["#productTitle", "span#productTitle"])
    if title:
        return title

    fallback = normalize_space(soup.title.get_text(" ", strip=True) if soup.title else "")
    fallback = re.sub(r"\s*[:|\-]\s*Amazon.*$", "", fallback, flags=re.IGNORECASE)

    lowered = fallback.lower()
    if any(marker in lowered for marker in ("robot check", "amazon captcha", "sorry! something went wrong")):
        return ""

    return fallback


def extract_price(soup: BeautifulSoup) -> str:
    return first_text(
        soup,
        [
            "#corePrice_feature_div .a-offscreen",
            "#corePriceDisplay_desktop_feature_div .a-offscreen",
            ".priceToPay .a-offscreen",
            ".a-price .a-offscreen",
            "#price_inside_buybox",
            ".apexPriceToPay .a-offscreen",
        ],
    )


def extract_rating(soup: BeautifulSoup) -> str:
    return (
        first_attribute(soup, ["#acrPopover"], "title")
        or first_text(soup, [".a-icon-alt", "#averageCustomerReviews_feature_div .a-size-base"])
    )


def extract_product_data(html: str, media: dict | None) -> dict[str, object]:
    soup = BeautifulSoup(html, "lxml")
    features = gather_features(soup)

    return {
        "title": extract_title(soup),
        "price": extract_price(soup),
        "description": build_description(soup, features),
        "images": gather_images(soup, media),
        "rating": extract_rating(soup),
        "features": features,
    }


async def scrape_amazon_product(url: str) -> dict[str, object]:
    hostname = (urlparse(url).hostname or "").lower()
    if "amazon." not in hostname:
        raise ValueError("Paste a full Amazon product URL.")

    browser_config = BrowserConfig(
        browser_type="chromium",
        channel="chromium",
        headless=True,
        verbose=False,
        enable_stealth=True,
        use_persistent_context=True,
        user_data_dir=str(PROJECT_ROOT / ".crawl4ai-profile"),
        ignore_https_errors=True,
        viewport_width=1440,
        viewport_height=1600,
    )

    async with AsyncWebCrawler(config=browser_config) as crawler:
        attempts = [
            CrawlerRunConfig(
                cache_mode=CacheMode.BYPASS,
                wait_for="css:#productTitle",
                wait_for_timeout=30_000,
                page_timeout=75_000,
                delay_before_return_html=1.2,
                wait_for_images=True,
                scan_full_page=True,
                max_scroll_steps=14,
                scroll_delay=0.25,
                simulate_user=True,
                magic=True,
                override_navigator=True,
                remove_overlay_elements=True,
                max_retries=1,
                verbose=False,
                log_console=False,
            ),
            CrawlerRunConfig(
                cache_mode=CacheMode.BYPASS,
                wait_for="css:body",
                wait_for_timeout=15_000,
                page_timeout=90_000,
                delay_before_return_html=3.0,
                wait_for_images=True,
                scan_full_page=True,
                max_scroll_steps=18,
                scroll_delay=0.35,
                simulate_user=True,
                magic=True,
                override_navigator=True,
                remove_overlay_elements=True,
                max_retries=2,
                verbose=False,
                log_console=False,
            ),
        ]

        last_error = "Crawl4AI could not load the Amazon page."

        for run_config in attempts:
            try:
                result = await crawler.arun(url=url, config=run_config)
            except Exception as error:
                last_error = str(error)
                continue

            if not result.success:
                last_error = result.error_message or last_error
                continue

            if not result.html:
                last_error = "Crawl4AI returned no HTML for the Amazon page."
                continue

            product = extract_product_data(result.html, result.media)
            if product["title"]:
                return product

            last_error = "Could not extract product data from the Amazon page."

    raise RuntimeError(last_error)


def main() -> int:
    parser = argparse.ArgumentParser(description="Scrape an Amazon product page with Crawl4AI.")
    parser.add_argument("url", help="Full Amazon product URL")
    args = parser.parse_args()

    try:
        payload = asyncio.run(scrape_amazon_product(args.url))
        sys.stdout.write(json.dumps(payload, ensure_ascii=False))
        sys.stdout.flush()
        return 0
    except Exception as error:
        sys.stderr.write(str(error))
        sys.stderr.flush()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
