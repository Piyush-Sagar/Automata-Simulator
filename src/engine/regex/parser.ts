export type RegexAST =
  | { kind: "literal"; value: string }
  | { kind: "epsilon" | "empty" }
  | { kind: "union" | "concat"; left: RegexAST; right: RegexAST }
  | { kind: "star"; child: RegexAST };

export interface Token {
  value: string;
  escaped: boolean;
  position: number;
}

export function tokenizeRegex(source: string): Token[] {
  if (source.length > 256)
    throw new Error("Regex is limited to 256 characters.");
  const chars = Array.from(source),
    tokens: Token[] = [];
  for (let i = 0; i < chars.length; i++) {
    const position = i + 1;
    if (chars[i] === "\\") {
      if (++i === chars.length)
        throw new Error("An escape must be followed by a literal character.");
      if (chars[i] === "ε")
        throw new Error(
          "ε is reserved for empty input and cannot be a literal.",
        );
      tokens.push({ value: chars[i], escaped: true, position });
    } else tokens.push({ value: chars[i], escaped: false, position });
  }
  return tokens;
}

export function parseRegex(source: string): RegexAST {
  const tokens = tokenizeRegex(source);
  let index = 0,
    depth = 0;
  const at = (value: string) =>
    tokens[index]?.value === value && !tokens[index]?.escaped;
  const error = (message: string): never => {
    throw new Error(
      `${message} at character ${tokens[index]?.position ?? source.length + 1}.`,
    );
  };
  function atom(): RegexAST {
    if (at("(")) {
      index++;
      if (++depth > 64) error("Maximum nesting depth (64) exceeded");
      if (at(")")) error("Empty group; use ε for empty input");
      const node = union();
      if (!at(")")) error("Expected closing parenthesis");
      index++;
      depth--;
      return node;
    }
    const token = tokens[index];
    if (
      !token ||
      (!token.escaped && ["|", ")", "*", "+", "?"].includes(token.value))
    )
      error("Expected a literal or group");
    index++;
    return !token.escaped && token.value === "ε"
      ? { kind: "epsilon" }
      : !token.escaped && token.value === "∅"
        ? { kind: "empty" }
        : { kind: "literal", value: token.value };
  }
  function repeat(): RegexAST {
    let node = atom();
    while (at("*") || at("+") || at("?")) {
      const op = tokens[index++].value;
      node =
        op === "*"
          ? { kind: "star", child: node }
          : op === "+"
            ? {
                kind: "concat",
                left: node,
                right: { kind: "star", child: node },
              }
            : { kind: "union", left: node, right: { kind: "epsilon" } };
    }
    return node;
  }
  function concat(): RegexAST {
    let node = repeat();
    while (index < tokens.length && !at("|") && !at(")"))
      node = { kind: "concat", left: node, right: repeat() };
    return node;
  }
  function union(): RegexAST {
    let node = concat();
    while (at("|")) {
      index++;
      node = { kind: "union", left: node, right: concat() };
    }
    return node;
  }
  if (!tokens.length) return { kind: "epsilon" };
  const node = union();
  if (index !== tokens.length) error("Unexpected closing parenthesis");
  return node;
}
