"use client";

import {
  Block,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  PartialBlock,
} from "@blocknote/core";
import {
  AddBlockButton,
  BlockColorsItem,
  blockTypeSelectItems,
  DragHandleButton,
  DragHandleMenu,
  type DragHandleMenuProps,
  SideMenu,
  type SideMenuProps,
  useBlockNoteEditor,
  useComponentsContext,
  useDictionary,
} from "@blocknote/react";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Link2,
  PaintBucket,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { useMemo, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { RiCodeBlock } from "react-icons/ri";
import { toast } from "sonner";

type EditorBlock = Block<
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema
>;

type EditorPartialBlock = PartialBlock<
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema
>;

type EditorSideMenuProps = SideMenuProps<
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema
>;

type EditorDragHandleMenuProps = DragHandleMenuProps<
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema
>;

type TransformMenuItem = {
  key: string;
  name: string;
  type: string;
  props?: Record<string, boolean | number | string>;
  icon: IconType;
  isSelected: (block: EditorBlock) => boolean;
};

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneBlockForInsertion(block: EditorBlock): EditorPartialBlock {
  return {
    type: block.type,
    props: deepClone(block.props),
    content:
      block.content === undefined
        ? undefined
        : deepClone(block.content) as EditorPartialBlock["content"],
    children: Array.isArray(block.children)
      ? block.children.filter(Boolean).map(cloneBlockForInsertion)
      : [],
  } as EditorPartialBlock;
}

function titleCaseBlockType(type: string) {
  return type
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase());
}

function getTransformItemKey(
  type: string,
  props?: Record<string, boolean | number | string>,
) {
  return [
    type,
    props?.level ?? "",
    props?.isToggleable ? "toggle" : "",
  ].join(":");
}

function getTransformItemName(
  type: string,
  props?: Record<string, boolean | number | string>,
  fallback?: string,
) {
  if (type === "paragraph") return "Text";
  if (type === "heading") {
    const level = typeof props?.level === "number" ? props.level : 1;
    return `${props?.isToggleable ? "Toggle heading" : "Heading"} ${level}`;
  }
  if (type === "bulletListItem") return "Bulleted list";
  if (type === "numberedListItem") return "Numbered list";
  if (type === "checkListItem") return "To-do list";
  if (type === "toggleListItem") return "Toggle list";
  if (type === "codeBlock") return "Code";
  return fallback ?? titleCaseBlockType(type);
}

function ActionLabel({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="notion-block-menu__label">
      <span className="notion-block-menu__icon">{icon}</span>
      <span>{children}</span>
    </span>
  );
}

function NotionDragHandleMenu(props: EditorDragHandleMenuProps) {
  const editor = useBlockNoteEditor<
    DefaultBlockSchema,
    DefaultInlineContentSchema,
    DefaultStyleSchema
  >();
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const transformItems = useMemo<TransformMenuItem[]>(() => {
    const items = blockTypeSelectItems(dict)
      .filter((item) => {
        if (!(item.type in editor.schema.blockSchema)) {
          return false;
        }

        if (
          item.type === "heading" &&
          typeof item.props?.level === "number" &&
          !editor.settings.heading.levels.includes(
            item.props.level as 1 | 2 | 3 | 4 | 5 | 6,
          )
        ) {
          return false;
        }

        return true;
      })
      .map(
        (item): TransformMenuItem => ({
          key: getTransformItemKey(item.type, item.props),
          name: getTransformItemName(item.type, item.props, item.name),
          type: item.type,
          props: item.props,
          icon: item.icon,
          isSelected: item.isSelected as unknown as (
            block: EditorBlock,
          ) => boolean,
        }),
      );

    if ("codeBlock" in editor.schema.blockSchema) {
      items.push({
        key: "codeBlock",
        name: "Code",
        type: "codeBlock",
        props: undefined,
        icon: RiCodeBlock,
        isSelected: (block) => block.type === "codeBlock",
      });
    }

    return items;
  }, [dict, editor]);

  const blockLabel = useMemo(() => {
    const currentTransform = transformItems.find((item) =>
      item.isSelected(props.block as EditorBlock),
    );

    if (currentTransform) {
      return currentTransform.name;
    }

    return getTransformItemName(
      props.block.type,
      props.block.props as Record<string, boolean | number | string> | undefined,
      titleCaseBlockType(props.block.type),
    );
  }, [props.block, transformItems]);

  const transformBlock = (item: TransformMenuItem) => {
    editor.focus();

    const updatedBlock = editor.updateBlock(props.block, {
      type: item.type,
      props: item.props,
    } as any);

    editor.setTextCursorPosition(updatedBlock, "end");
  };

  const duplicateBlock = () => {
    editor.focus();

    const insertedBlock = editor.insertBlocks(
      [cloneBlockForInsertion(props.block as EditorBlock)],
      props.block,
      "after",
    )[0];

    if (insertedBlock) {
      editor.setTextCursorPosition(insertedBlock, "end");
    }
  };

  const copyBlockLink = async () => {
    if (typeof window === "undefined" || !navigator.clipboard) {
      toast.error("Clipboard access is not available here");
      return;
    }

    try {
      const url = new URL(window.location.href);
      url.hash = props.block.id;
      await navigator.clipboard.writeText(url.toString());
      toast.success("Copied link to block");
    } catch {
      toast.error("Could not copy block link");
    }
  };

  const moveBlock = (direction: "up" | "down") => {
    editor.focus();
    editor.setSelection(props.block.id, props.block.id);

    if (direction === "up") {
      editor.moveBlocksUp();
    } else {
      editor.moveBlocksDown();
    }

    editor.setTextCursorPosition(props.block.id, "end");
  };

  return (
    <DragHandleMenu {...props}>
      <Components.Generic.Menu.Label className="notion-block-menu__title">
        {blockLabel}
      </Components.Generic.Menu.Label>

      <Components.Generic.Menu.Root position="right-start" sub={true}>
        <Components.Generic.Menu.Trigger sub={true}>
          <Components.Generic.Menu.Item
            className="bn-menu-item notion-block-menu__item"
            icon={<RefreshCcw size={16} />}
            subTrigger={true}
          >
            Turn into
          </Components.Generic.Menu.Item>
        </Components.Generic.Menu.Trigger>

        <Components.Generic.Menu.Dropdown
          sub={true}
          className="bn-menu-dropdown notion-block-menu notion-block-menu--submenu"
        >
          {transformItems.map((item) => {
            const Icon = item.icon;

            return (
              <Components.Generic.Menu.Item
                key={item.key}
                className="bn-menu-item notion-block-menu__item"
                icon={<Icon size={16} />}
                checked={item.isSelected(props.block as EditorBlock)}
                onClick={() => transformBlock(item)}
              >
                {item.name}
              </Components.Generic.Menu.Item>
            );
          })}
        </Components.Generic.Menu.Dropdown>
      </Components.Generic.Menu.Root>

      <BlockColorsItem {...props}>
        <ActionLabel icon={<PaintBucket size={16} />}>Color</ActionLabel>
      </BlockColorsItem>

      <Components.Generic.Menu.Divider className="notion-block-menu__divider" />

      <Components.Generic.Menu.Item
        className="bn-menu-item notion-block-menu__item"
        icon={<Link2 size={16} />}
        onClick={copyBlockLink}
      >
        Copy link to block
      </Components.Generic.Menu.Item>

      <Components.Generic.Menu.Item
        className="bn-menu-item notion-block-menu__item"
        icon={<Copy size={16} />}
        onClick={duplicateBlock}
      >
        Duplicate
      </Components.Generic.Menu.Item>

      <Components.Generic.Menu.Item
        className="bn-menu-item notion-block-menu__item"
        icon={<ArrowUp size={16} />}
        onClick={() => moveBlock("up")}
      >
        Move up
      </Components.Generic.Menu.Item>

      <Components.Generic.Menu.Item
        className="bn-menu-item notion-block-menu__item"
        icon={<ArrowDown size={16} />}
        onClick={() => moveBlock("down")}
      >
        Move down
      </Components.Generic.Menu.Item>

      <Components.Generic.Menu.Divider className="notion-block-menu__divider" />

      <Components.Generic.Menu.Item
        className="bn-menu-item notion-block-menu__item notion-block-menu__item--danger"
        icon={<Trash2 size={16} />}
        onClick={() => editor.removeBlocks([props.block])}
      >
        Delete
      </Components.Generic.Menu.Item>
    </DragHandleMenu>
  );
}

export function NotionSideMenu(props: EditorSideMenuProps) {
  return (
    <SideMenu {...props}>
      <AddBlockButton {...props} />
      <DragHandleButton {...props} dragHandleMenu={NotionDragHandleMenu} />
    </SideMenu>
  );
}
