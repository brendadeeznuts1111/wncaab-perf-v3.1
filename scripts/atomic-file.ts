#!/usr/bin/env bun
/**
 * Atomic File Operations - Corruption-Proof Writes (v1.4)
 * 
 * Provides atomic file write operations using temp files + rename pattern.
 */

export class AtomicFile {
  /**
   * Atomic write: writes to temp file, then renames atomically
   */
  async write(filePath: string, content: string): Promise<void> {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    await Bun.write(tempPath, content);
    
    // Atomic rename (OS-level atomic operation)
    await Bun.$`mv ${tempPath} ${filePath}`.quiet();
  }

  /**
   * Atomic write with JSON serialization
   */
  async writeJSON(filePath: string, data: any, indent: number = 2): Promise<void> {
    const content = JSON.stringify(data, null, indent);
    await this.write(filePath, content);
  }

  /**
   * Read file safely
   */
  async read(filePath: string): Promise<string> {
    return await Bun.file(filePath).text();
  }

  /**
   * Read JSON file safely
   */
  async readJSON<T = any>(filePath: string): Promise<T> {
    const content = await this.read(filePath);
    return JSON.parse(content);
  }

  /**
   * Check if file exists
   */
  async exists(filePath: string): Promise<boolean> {
    return await Bun.file(filePath).exists();
  }
}

