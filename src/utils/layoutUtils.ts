export const getRandomPosition = (maxX: number, maxY: number) => {
  const x = Math.random() * maxX;
  const y = Math.random() * maxY;
  return { x, y };
};

export const calculateMaxDimensions = (
  containerRect: DOMRect,
  elementWidth: number,
  elementHeight: number
) => {
  const maxX = containerRect.width - elementWidth;
  const maxY = containerRect.height - elementHeight;
  return { maxX, maxY };
};
