// The second factor is required for enrolled accounts even during a progressive rollout.
export function needsSecondFactor(currentLevel: string | null, hasVerifiedFactor: boolean, nextLevel: string | null, required: boolean): boolean {
  return (required && !hasVerifiedFactor) || (currentLevel !== 'aal2' && (required || hasVerifiedFactor || nextLevel === 'aal2'));
}
