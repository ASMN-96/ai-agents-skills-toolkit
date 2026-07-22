export function reviewSource({ license, reviewed, activationRequested }) {
  return Object.freeze({ approved: license === "MIT" && reviewed === true && activationRequested === false, activation: "forbidden" });
}
