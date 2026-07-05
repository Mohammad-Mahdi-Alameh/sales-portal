export interface ColumnDef {
  /** Property key on the row (also used as sort field when sortable). */
  key: string;
  /** Header label. */
  label: string;
  /** Enables client-triggered sort on this column. */
  sortable?: boolean;
  /** Extra classes for the header/body cell alignment. */
  align?: 'left' | 'right' | 'center';
}
