import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export function DataTable({ columns, rows, renderCell }) {
  return (
    <Table>
      <THead>
        <TR>
          {columns.map((column) => (
            <TH key={column}>{column}</TH>
          ))}
        </TR>
      </THead>
      <TBody>
        {rows.map((row, index) => (
          <TR key={row.id || index}>
            {columns.map((column) => (
              <TD key={column}>{renderCell ? renderCell(row, column) : row[column]}</TD>
            ))}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
