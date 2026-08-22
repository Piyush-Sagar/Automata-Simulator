import type { DFA, DFATransition, State } from "../types";

export interface PartitionStep {
  partitions: string[][]; // Array of state ID arrays
}

export interface MinimizationTrace {
  reachableStates: string[];
  steps: PartitionStep[];
  mapping: Map<string, string[]>; // New DFA state ID -> Original DFA state IDs
}

export function minimizeDFA(
  dfa: DFA,
): { dfa: DFA; trace: MinimizationTrace } | { error: string } {
  if (!dfa.startState) {
    return { error: "DFA has no start state." };
  }

  // 1. Find reachable states using BFS
  const reachable = new Set<string>();
  const queue = [dfa.startState];
  reachable.add(dfa.startState);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const transitions = dfa.transitions.filter((t) => t.from === current);
    for (const t of transitions) {
      if (!reachable.has(t.to)) {
        reachable.add(t.to);
        queue.push(t.to);
      }
    }
  }

  const reachableStates = Array.from(reachable).sort();
  
  // 2. Initialize partitions P = { F, Q \ F }
  const acceptPartition = reachableStates.filter((s) => dfa.acceptStates.includes(s));
  const nonAcceptPartition = reachableStates.filter((s) => !dfa.acceptStates.includes(s));

  let partitions: string[][] = [];
  if (acceptPartition.length > 0) partitions.push(acceptPartition);
  if (nonAcceptPartition.length > 0) partitions.push(nonAcceptPartition);

  const steps: PartitionStep[] = [{ partitions: [...partitions] }];

  // Helper to find which partition a state belongs to
  function getPartitionIndex(state: string, parts: string[][]): number {
    return parts.findIndex((p) => p.includes(state));
  }

  let changed = true;
  while (changed) {
    changed = false;
    const newPartitions: string[][] = [];

    for (const partition of partitions) {
      // Split this partition if necessary
      // Map: signature -> array of states
      // signature is a string of partition indices for each symbol in the alphabet
      const signatureMap = new Map<string, string[]>();

      for (const state of partition) {
        const sigArray = dfa.alphabet.map((symbol) => {
          const t = dfa.transitions.find(
            (t) => t.from === state && t.symbol === symbol,
          );
          if (!t) return "-1"; // Transition to dead state
          return getPartitionIndex(t.to, partitions).toString();
        });
        const signature = sigArray.join(",");
        if (!signatureMap.has(signature)) {
          signatureMap.set(signature, []);
        }
        signatureMap.get(signature)!.push(state);
      }

      const splits = Array.from(signatureMap.values());
      newPartitions.push(...splits);
      if (splits.length > 1) {
        changed = true;
      }
    }

    partitions = newPartitions;
    if (changed) {
      steps.push({ partitions: [...partitions] });
    }
  }

  // 3. Construct minimized DFA
  const minStates: State[] = [];
  const minTransitions: DFATransition[] = [];
  const minAcceptStates: string[] = [];
  const mapping = new Map<string, string[]>();

  let minStartState: string | null = null;

  for (let i = 0; i < partitions.length; i++) {
    const partition = partitions[i];
    const newStateId = `M${i}`;
    mapping.set(newStateId, partition);

    const isStart = partition.includes(dfa.startState);
    if (isStart) minStartState = newStateId;

    const isAccept = partition.some((s) => dfa.acceptStates.includes(s));
    if (isAccept) minAcceptStates.push(newStateId);

    minStates.push({
      id: newStateId,
      label: newStateId,
      x: 100 + (i % 5) * 150,
      y: 100 + Math.floor(i / 5) * 100,
      isStart,
      isAccept,
    });
  }

  // Re-map transitions
  const seenTransitions = new Set<string>();
  for (let i = 0; i < partitions.length; i++) {
    const partition = partitions[i];
    const repState = partition[0]; // Representative state

    for (const symbol of dfa.alphabet) {
      const t = dfa.transitions.find((t) => t.from === repState && t.symbol === symbol);
      if (t && reachable.has(t.to)) {
        const toPartitionIndex = getPartitionIndex(t.to, partitions);
        const toStateId = `M${toPartitionIndex}`;
        const key = `M${i}::${symbol}`;
        if (!seenTransitions.has(key)) {
          minTransitions.push({
            id: crypto.randomUUID(),
            from: `M${i}`,
            to: toStateId,
            symbol,
          });
          seenTransitions.add(key);
        }
      }
    }
  }

  return {
    dfa: {
      id: crypto.randomUUID(),
      name: `Minimized ${dfa.name}`,
      type: "DFA",
      states: minStates,
      alphabet: dfa.alphabet,
      startState: minStartState,
      acceptStates: minAcceptStates,
      transitions: minTransitions,
    },
    trace: { reachableStates, steps, mapping },
  };
}
