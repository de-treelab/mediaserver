export const isTypingInInput = (): boolean => {
  const activeElement = document.activeElement as HTMLElement | null;
  if (!activeElement) {
    return false;
  }

  const tagName = activeElement.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    activeElement.isContentEditable
  );
};
