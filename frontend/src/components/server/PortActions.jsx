import { Copy, Edit, EyeOff, Eye } from "lucide-react";
import { ActionButton } from "./ActionButton";

export function PortActions({
  port,
  itemKey,
  actionFeedback,
  onCopy,
  onEdit,
  onHide,
  size,
}) {
  return (
    <div className="flex items-center space-x-1">
      <ActionButton
        type="copy"
        itemKey={itemKey}
        actionFeedback={actionFeedback}
        onClick={onCopy}
        icon={Copy}
        title="复制 URL 到剪贴板"
        size={size}
      />
      <ActionButton
        type="edit"
        itemKey={itemKey}
        actionFeedback={actionFeedback}
        onClick={onEdit}
        icon={Edit}
        title="编辑备注"
        size={size}
      />
      <ActionButton
        type={port.ignored ? "unhide" : "hide"}
        itemKey={itemKey}
        actionFeedback={actionFeedback}
        onClick={onHide}
        icon={port.ignored ? Eye : EyeOff}
        title={port.ignored ? "显示此端口" : "隐藏此端口"}
        size={size}
      />
    </div>
  );
}
