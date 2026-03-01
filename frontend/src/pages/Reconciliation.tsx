import { useState, useRef } from 'react';
import { toast } from 'sonner';
import { Upload, FileCheck, AlertTriangle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useReconcileMasterFile, usePersistMasterDataRows } from '@/hooks/useQueries';
import type { MasterDataRow, MasterReconciliationResult, Order } from '@/backend';
import { normalizeDesignCode } from '@/utils/excelParser';

/**
 * Extended row type that carries the parsed Order Type alongside the
 * standard MasterDataRow fields. The orderType is used for display only
 * since MasterDataRow (backend type) does not include it.
 */
interface ReconciliationRow extends MasterDataRow {
  orderType: 'SO' | 'CO' | 'RB';
}

/**
 * Normalize a header name for comparison: uppercase, remove spaces and underscores.
 * e.g. "Order T", "Order Type", "ORDERTYPE" all become "ORDERTYPE"
 * Also handles the truncated "Order T" header seen in the Excel file.
 */
function normalizeHeaderForOrderType(name: string): boolean {
  const normalized = name.trim().toUpperCase().replace(/[\s_]+/g, '');
  // Match "ORDERTYPE", "ORDERT" (truncated), "ORDER T" variants
  return normalized === 'ORDERTYPE' || normalized === 'ORDERT';
}

/**
 * Resolve the Order Type value from a raw cell string.
 * Returns 'RB' for "RB", 'SO' for "SO", 'CO' for "CO", blank, or unrecognised.
 */
function resolveOrderType(raw: string): 'SO' | 'CO' | 'RB' {
  const normalized = String(raw || '').trim().toUpperCase();
  if (normalized === 'RB') return 'RB';
  if (normalized === 'SO') return 'SO';
  return 'CO';
}

async function parseMasterFileForReconciliation(file: File): Promise<ReconciliationRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        const XLSX: any = await import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs' as any);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // ── Step 1: Scan row 1 headers to find the Order Type column key ──────
        // sheet_to_json with header:1 gives us the first row as an array of values.
        const headerRows: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
          range: 0, // only first row
        });

        let orderTypeHeaderKey: string | null = null;
        if (headerRows.length > 0) {
          const firstRow: any[] = headerRows[0];
          for (const cell of firstRow) {
            if (cell !== undefined && cell !== null && String(cell).trim() !== '') {
              const cellStr = String(cell).trim();
              if (normalizeHeaderForOrderType(cellStr)) {
                orderTypeHeaderKey = cellStr;
                break;
              }
            }
          }
        }

        // ── Step 2: Parse data rows ─────────────────────────────────────────
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const rows: ReconciliationRow[] = [];
        for (const row of jsonData as any[]) {
          const orderNo = String(
            row['Order No'] || row['OrderNo'] || row['ORDER NO'] || row['order no'] || ''
          ).trim();
          const designCodeRaw = String(
            row['Design Code'] || row['DesignCode'] || row['Design'] || row['DESIGN CODE'] || row['design code'] || ''
          ).trim();
          const designCode = normalizeDesignCode(designCodeRaw);
          const karigar = String(
            row['Karigar'] || row['KARIGAR'] || row['karigar'] || row['Karigar Name'] || ''
          ).trim();
          const weight = Number(row['Weight'] || row['WEIGHT'] || row['weight'] || 0);
          const quantity = BigInt(
            Math.round(Number(row['Quantity'] || row['QUANTITY'] || row['quantity'] || row['Qty'] || 0))
          );

          // ── Read Order Type from the detected column (column B = "Order T") ──
          let orderType: 'SO' | 'CO' | 'RB' = 'CO';
          if (orderTypeHeaderKey !== null) {
            const rawVal = String(row[orderTypeHeaderKey] || '').trim();
            orderType = resolveOrderType(rawVal);
          }

          if (orderNo && designCode) {
            rows.push({ orderNo, designCode, karigar, weight, quantity, orderType });
          }
        }
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'default' | 'gold' | 'green' | 'red';
}) {
  const colorMap = {
    default: 'bg-muted text-foreground',
    gold: 'bg-gold/10 text-gold border border-gold/30',
    green: 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30',
    red: 'bg-destructive/10 text-destructive border border-destructive/30',
  };
  return (
    <Card className={`${colorMap[color]} rounded-xl`}>
      <CardContent className="pt-5 pb-4 px-5">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs font-medium mt-1 opacity-80">{label}</p>
      </CardContent>
    </Card>
  );
}

function OrderTypeBadge({ type }: { type: 'SO' | 'CO' | 'RB' }) {
  const styles: Record<string, string> = {
    SO: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30',
    CO: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30',
    RB: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30',
  };
  return (
    <Badge className={`${styles[type] ?? styles['CO']} hover:opacity-80`}>
      {type}
    </Badge>
  );
}

export default function Reconciliation() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [result, setResult] = useState<MasterReconciliationResult | null>(null);
  // Store the full parsed rows (with orderType) separately for display
  const [parsedNewLines, setParsedNewLines] = useState<ReconciliationRow[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const reconcileMutation = useReconcileMasterFile();
  const persistMutation = usePersistMasterDataRows();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setResult(null);
    setParsedNewLines([]);
    setSelectedKeys(new Set());

    try {
      const rows = await parseMasterFileForReconciliation(file);
      if (rows.length === 0) {
        toast.error('No valid rows found in the uploaded file. Please check the format.');
        setIsParsing(false);
        return;
      }
      // Pass only the MasterDataRow fields to the backend (orderType is frontend-only)
      const masterDataRows: MasterDataRow[] = rows.map(({ orderType: _ot, ...rest }) => rest);
      const reconciliationResult = await reconcileMutation.mutateAsync(masterDataRows);
      setResult(reconciliationResult);

      // Build a lookup map for the new lines so we can attach orderType for display
      const newLineKeys = new Set(
        reconciliationResult.newLines.map((r) => `${r.orderNo}__${r.designCode}`)
      );
      const newLinesWithType = rows.filter((r) =>
        newLineKeys.has(`${r.orderNo}__${r.designCode}`)
      );
      setParsedNewLines(newLinesWithType);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Reconciliation failed: ${message}`);
    } finally {
      setIsParsing(false);
      // Reset file input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const rowKey = (row: MasterDataRow) => `${row.orderNo}__${row.designCode}`;

  const allSelected =
    parsedNewLines.length > 0 && selectedKeys.size === parsedNewLines.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(parsedNewLines.map(rowKey)));
    }
  };

  const toggleRow = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (!result || selectedKeys.size === 0) return;
    const selectedRows = parsedNewLines.filter((r) => selectedKeys.has(rowKey(r)));
    // Strip orderType before sending to backend (MasterDataRow doesn't include it)
    const masterDataRows: MasterDataRow[] = selectedRows.map(({ orderType: _ot, ...rest }) => rest);
    try {
      const response = await persistMutation.mutateAsync(masterDataRows);
      const count = response.persisted.length;
      toast.success(
        count > 0
          ? `${count} order${count !== 1 ? 's' : ''} added to Total Orders successfully.`
          : 'No new orders were added (all may already exist).'
      );
      // Remove persisted rows from the new lines section
      const persistedKeys = new Set(
        response.persisted.map((o: Order) => `${o.orderNo}__${o.design}`)
      );
      const remainingParsed = parsedNewLines.filter((r) => !persistedKeys.has(rowKey(r)));
      setParsedNewLines(remainingParsed);
      setResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          newLines: remainingParsed,
          newLinesCount: BigInt(remainingParsed.length),
          alreadyExistingRows: BigInt(Number(prev.alreadyExistingRows) + response.persisted.length),
        };
      });
      setSelectedKeys(new Set());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to add orders: ${message}`);
    }
  };

  const isLoading = isParsing || reconcileMutation.isPending;

  const noDifferences =
    result &&
    parsedNewLines.length === 0 &&
    result.missingInMaster.length === 0;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
          <FileCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Reconciliation</h1>
          <p className="text-sm text-muted-foreground">
            Compare your master Excel file against existing database records
          </p>
        </div>
      </div>

      <Separator />

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload Master Excel File</CardTitle>
          <CardDescription>
            Upload the latest full master Excel file (.xlsx or .xls). The system will compare all
            rows against existing records using Order No + Design Code as the unique key.
            Order Type (SO, CO, RB) is read from column B.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
              disabled={isLoading}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isParsing ? 'Parsing file…' : 'Reconciling…'}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload & Reconcile
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Accepted formats: .xlsx, .xls — Expected columns: Order No, Order Type, Design Code,
              Karigar, Weight, Quantity
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              label="Total Uploaded Rows"
              value={Number(result.totalUploadedRows)}
              color="default"
            />
            <SummaryCard
              label="Already Existing"
              value={Number(result.alreadyExistingRows)}
              color="green"
            />
            <SummaryCard
              label="New Lines"
              value={parsedNewLines.length}
              color="gold"
            />
            <SummaryCard
              label="Missing in Master"
              value={Number(result.missingInMasterCount)}
              color="red"
            />
          </div>

          {/* No differences */}
          {noDifferences && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>All Clear</AlertTitle>
              <AlertDescription>No reconciliation differences found.</AlertDescription>
            </Alert>
          )}

          {/* Section 1: New Lines Found */}
          {parsedNewLines.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      New Lines Found
                      <Badge variant="secondary">{parsedNewLines.length}</Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      These rows exist in the uploaded file but are not found in any existing table.
                      Select rows to add them to Total Orders.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleAddSelected}
                    disabled={selectedKeys.size === 0 || persistMutation.isPending}
                    size="sm"
                    className="gap-2 shrink-0"
                  >
                    {persistMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Add Selected to Total Orders
                        {selectedKeys.size > 0 && (
                          <Badge variant="outline" className="ml-1 text-xs">
                            {selectedKeys.size}
                          </Badge>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 pl-4">
                          <Checkbox
                            checked={!!allSelected}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Select all"
                          />
                        </TableHead>
                        <TableHead>Order No</TableHead>
                        <TableHead>Order Type</TableHead>
                        <TableHead>Design Code</TableHead>
                        <TableHead>Karigar</TableHead>
                        <TableHead className="text-right">Weight</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedNewLines.map((row) => {
                        const key = rowKey(row);
                        return (
                          <TableRow
                            key={key}
                            className="cursor-pointer"
                            onClick={() => toggleRow(key)}
                          >
                            <TableCell className="pl-4" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={selectedKeys.has(key)}
                                onCheckedChange={() => toggleRow(key)}
                                aria-label={`Select ${row.orderNo}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{row.orderNo}</TableCell>
                            <TableCell>
                              <OrderTypeBadge type={row.orderType} />
                            </TableCell>
                            <TableCell>{row.designCode}</TableCell>
                            <TableCell>{row.karigar || '—'}</TableCell>
                            <TableCell className="text-right">{row.weight.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{String(row.quantity)}</TableCell>
                            <TableCell>
                              <Badge className="bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20">
                                New
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Section 2: Missing in Master */}
          {result.missingInMaster.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      Missing in Master
                      <Badge variant="destructive">{result.missingInMaster.length}</Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      These records exist in the database (Pending or Ready status) but were{' '}
                      <strong>not found</strong> in the uploaded master file. This section is for
                      review only — no records will be modified or deleted automatically.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Alert className="mx-4 mb-3 border-amber-500/30 bg-amber-500/5">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                    Informational only. No automatic changes will be made to these records.
                  </AlertDescription>
                </Alert>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order No</TableHead>
                        <TableHead>Order Type</TableHead>
                        <TableHead>Design Code</TableHead>
                        <TableHead>Current Status</TableHead>
                        <TableHead>Karigar</TableHead>
                        <TableHead className="text-right">Weight</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead>Flag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.missingInMaster.map((order) => (
                        <TableRow key={order.orderId}>
                          <TableCell className="font-medium">{order.orderNo}</TableCell>
                          <TableCell>
                            <OrderTypeBadge
                              type={
                                order.orderType === 'RB'
                                  ? 'RB'
                                  : order.orderType === 'SO'
                                  ? 'SO'
                                  : 'CO'
                              }
                            />
                          </TableCell>
                          <TableCell>{order.design}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                order.status === 'Ready'
                                  ? 'border-blue-500/40 text-blue-600 dark:text-blue-400'
                                  : 'border-muted-foreground/40 text-muted-foreground'
                              }
                            >
                              {String(order.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.karigarName || '—'}</TableCell>
                          <TableCell className="text-right">{order.weight.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{String(order.quantity)}</TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="text-xs">
                              Missing in Master
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
