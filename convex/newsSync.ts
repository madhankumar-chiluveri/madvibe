import { action } from "./_generated/server";
import { api } from "./_generated/api";

// This action fetches news from GNews, passes it to Gemini, and stores it in Convex.
export const fetchAndProcessNews = action({
  args: {},
  handler: async (ctx) => {
    // 1. Fetch API Keys from environment variables
    const gnewsApiKey = process.env.GNEWS_API_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!gnewsApiKey || !geminiApiKey) {
      console.warn("newsSync: Missing GNEWS_API_KEY or GEMINI_API_KEY. Skipping news sync.");
      return { success: false, reason: "Missing API keys" };
    }

    try {
      // 2. Fetch specific news from GNews (e.g., technology, business, or general top headlines)
      // Limit to max 10 to avoid burning through the free tier too fast in one go
      const gnewsUrl = `https://gnews.io/api/v4/top-headlines?category=technology&lang=en&max=10&apikey=${gnewsApiKey}`;
      const response = await fetch(gnewsUrl);
      if (!response.ok) {
        throw new Error(`GNews API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      const articles = data.articles || [];
      
      let processedCount = 0;

      for (const article of articles) {
        // Skip articles we might have already fetched recently based on exact title match
        // Note: For a robust system, we would query the DB first to deduplicate, 
        // but since we are inserting, we'll process and let insertion handle it if we want.
        
        // Prepare prompt for Gemini to structure our data
        const prompt = `
You are an expert AI news editor for a professional workspace app. Analyze the following news article and extract structured data.
Title: ${article.title}
Description: ${article.description}
Content Snippet: ${article.content}

Return a raw JSON object (DO NOT wrap in markdown code blocks like \`\`\`json) matching this strict format:
{
  "summary": "A concise 1 to 2 sentence summary.",
  "category": "Choose exactly one based on the content: 'ai_ml', 'tech_it', 'productivity', 'must_know', or 'general'",
  "tags": ["3", "relevant", "tags"],
  "sentiment": "Choose exactly one: 'positive', 'negative', 'neutral', or 'mixed'",
  "relevanceScore": 0.95 // A number between 0 and 1 indicating relevance to tech/business professionals
}
`;

        // 3. Call Gemini API natively
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
        const aiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1, // Low temp for structured JSON
              responseMimeType: "application/json",
            }
          })
        });

        if (!aiResponse.ok) {
          console.error(`Gemini API error: ${aiResponse.statusText}`);
          continue;
        }

        const aiData = await aiResponse.json();
        let aiResultStr = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!aiResultStr) continue;

        let enrichedData;
        try {
          enrichedData = JSON.parse(aiResultStr);
        } catch (e) {
          console.error("Failed to parse Gemini JSON:", aiResultStr);
          continue;
        }

        // 4. Save to database using our existing public mutation
        // Ensure category matches our literal type exactly
        const validCategories = ["for_you", "ai_ml", "tech_it", "productivity", "must_know", "general"];
        const validSentiments = ["positive", "neutral", "negative", "mixed"];
        
        const category = validCategories.includes(enrichedData.category) ? enrichedData.category : "tech_it";
        const sentiment = validSentiments.includes(enrichedData.sentiment) ? enrichedData.sentiment : "neutral";

        await ctx.runMutation(api.news.insertArticle, {
          title: article.title,
          source: article.source.name,
          url: article.url,
          summary: enrichedData.summary || article.description,
          category: category as any,
          tags: enrichedData.tags || [],
          relevanceScore: enrichedData.relevanceScore || 0.8,
          sentiment: sentiment as any,
          readingTimeMinutes: Math.max(1, Math.ceil((article.content?.length || 500) / 1000)),
          isBreaking: false, // Could also ask Gemini to determine this
          publishedAt: new Date(article.publishedAt).getTime(),
          fetchedAt: Date.now(),
          sourceUrl: article.source.url,
          thumbnailUrl: article.image,
          content: article.content,
        });

        processedCount++;
      }

      return { success: true, processed: processedCount };
    } catch (error) {
      console.error("Error in fetchAndProcessNews:", error);
      return { success: false, error: String(error) };
    }
  },
});
