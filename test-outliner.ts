import { CellOutliner } from './src/utils/CellOutliner';
import { Point, Cell } from '@davidsev/owlbear-utils';

// Mock Cell implementation since we can't easily import the abstract/concrete classes without full setup
class MockCell implements Cell {
  constructor(public center: Point, public dpi: number) { }

  get corners(): Point[] {
    const half = this.dpi / 2;
    return [
      new Point(this.center.x - half, this.center.y - half),
      new Point(this.center.x + half, this.center.y - half),
      new Point(this.center.x + half, this.center.y + half),
      new Point(this.center.x - half, this.center.y + half)
    ];
  }

  get edges() {
    // Mock edges for square
    const c = this.corners;
    return [
      { p1: c[0], p2: c[1] },
      { p1: c[1], p2: c[2] },
      { p1: c[2], p2: c[3] },
      { p1: c[3], p2: c[0] }
    ] as any;
  }

  nearestPointOnEdge(point: any): any { return point; }
  toString() { return `Cell(${this.center.x},${this.center.y})`; }
  isAdjacent(other: any) { return false; }
  containsPoint(point: any) { return false; }
  neighbors(include_corners: boolean) { return []; }
}

// Test Case 1: Single Cell
console.log('--- Test Case 1: Single Cell ---');
const dpi = 150;
const cell1 = new MockCell(new Point(75, 75), dpi);
const outliner1 = new CellOutliner([cell1]);
console.log('Outline 1:', JSON.stringify(outliner1.getOutlinePath()));

// Test Case 2: Two Adjacent Cells (Horizontal)
console.log('\n--- Test Case 2: Two Adjacent Cells ---');
const cell2 = new MockCell(new Point(225, 75), dpi); // 75 + 150
const outliner2 = new CellOutliner([cell1, cell2]);
console.log('Outline 2:', JSON.stringify(outliner2.getOutlinePath()));

// Test Case 3: L-Shape
console.log('\n--- Test Case 3: L-Shape ---');
const cell3 = new MockCell(new Point(75, 225), dpi); // Below cell1
const outliner3 = new CellOutliner([cell1, cell2, cell3]);
console.log('Outline 3:', JSON.stringify(outliner3.getOutlinePath()));
