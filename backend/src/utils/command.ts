import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export async function runCommand(command: string, args: string[] = []): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { encoding: 'utf8' });
    return { stdout, stderr };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to run ${command} ${args.join(' ')}: ${error.message}`);
    }
    throw error;
  }
}

export async function tryCommand(command: string, args: string[] = []): Promise<CommandResult | null> {
  try {
    return await runCommand(command, args);
  } catch {
    return null;
  }
}
