import { deepmerge } from 'deepmerge-ts';

export interface MergeOptions {
  /**
   * If true, template wins completely (clean scaffold).
   * If false (default), existing values are preserved and template fills gaps.
   */
  overwrite?: boolean;
}

/**
 * Merge an existing object with a template.
 *
 * In merge mode (default): existing values are preserved, template fills gaps.
 * In overwrite mode: template wins, produces clean scaffold.
 */
export function merge<T extends object>(
  existing: Partial<T>,
  template: T,
  options: MergeOptions = {}
): T {
  const { overwrite = false } = options;

  if (overwrite) {
    // Overwrite mode: return a copy of the template
    return { ...template };
  }

  // Merge mode: deepmerge with existing taking precedence
  // deepmerge-ts merges left-to-right, later values override earlier
  // So we put template first (base) and existing second (overrides)
  return deepmerge(template, existing) as T;
}
