function detectZalgo(content) {
  if (!content) return null;

  const chars = Array.from(content);
  let combiningMarks = 0;
  let maxRun = 0;
  let currentRun = 0;

  for (const char of chars) {
    if (/\p{M}/u.test(char)) {
      combiningMarks += 1;
      currentRun += 1;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 0;
    }
  }

  const visibleChars = Math.max(1, chars.length - combiningMarks);
  const ratio = combiningMarks / visibleChars;

  if ((combiningMarks >= 8 && ratio >= 0.3) || maxRun >= 5) {
    return { combiningMarks, ratio, maxRun };
  }

  return null;
}

module.exports = { detectZalgo };
