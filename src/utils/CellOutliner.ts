import { Cell, LineSegment, Point } from '@davidsev/owlbear-utils';
import { PathCommand } from '@owlbear-rodeo/sdk';
// type PathCommand = any[];

export const Command = {
  MOVE: 0,
  LINE: 1,
  QUAD: 2,
  CONIC: 3,
  CUBIC: 4,
  CLOSE: 5
} as const;

export class CellOutliner {

  public readonly cells: Cell[];
  public readonly outline: Point[][] = [];

  constructor(cells: Cell[]) {
    this.cells = cells;
    this.calculateOutline();
  }

  private calculateOutline() {
    if (!this.cells.length)
      return;

    // Break the cells into their constituent line segments.
    const lines: LineSegment[] = [];
    for (const cell of this.cells) {
      if (cell.edges) {
        lines.push(...cell.edges);
      }
    }

    // Count how many times each line shows up, any line that shows up more than once is internal and can be removed.
    const lineCounts = new Map<string, [LineSegment, number]>();
    for (const line of lines) {
      // Normalize key to handle different directions (A->B vs B->A)
      const key = [line.p1.toString(), line.p2.toString()].sort().join('|');
      const [storedLine, count] = lineCounts.get(key) ?? [line, 0];
      lineCounts.set(key, [storedLine, count + 1]);
    }

    const externalLines: LineSegment[] = [];
    for (const [line, count] of lineCounts.values()) {
      if (count === 1) {
        externalLines.push(line);
      }
    }

    if (!externalLines.length) {
      return;
    }

    // Sort the lines into order. Pick a starting point and then find the next line that has that point etc.
    while (externalLines.length > 0) {
      const points: Point[] = [];
      const firstLine = externalLines.shift();
      if (!firstLine) break;

      points.push(firstLine.p1, firstLine.p2);
      let currentPoint = firstLine.p2;

      // Trace the loop
      let loopClosed = false;
      while (!loopClosed && externalLines.length > 0) {
        // Find a line with our current point
        const nextLineIndex = externalLines.findIndex(line => line.p1.equals(currentPoint) || line.p2.equals(currentPoint));

        if (nextLineIndex === -1) {
          break;
        }

        const nextLine = externalLines[nextLineIndex];
        externalLines.splice(nextLineIndex, 1);

        // Add the new point to the list and make it the current point
        if (nextLine.p1.equals(currentPoint)) {
          points.push(nextLine.p2);
          currentPoint = nextLine.p2;
        } else {
          points.push(nextLine.p1);
          currentPoint = nextLine.p1;
        }

        // Check if we closed the loop (back to start)
        if (currentPoint.equals(points[0])) {
          loopClosed = true;
        }
      }

      this.outline.push(points);
    }
  }

  public getOutlinePath(): PathCommand[] {
    const commands: PathCommand[] = [];

    for (const group of this.outline) {
      if (group.length === 0) continue;

      const firstPoint = group[0];
      commands.push([Command.MOVE, firstPoint.x, firstPoint.y]);

      // Skip the first point since we moved to it, and iterate the rest
      for (let i = 1; i < group.length; i++) {
        const point = group[i];
        commands.push([Command.LINE, point.x, point.y]);
      }
      commands.push([Command.CLOSE]);
    }

    return commands;
  }
}
