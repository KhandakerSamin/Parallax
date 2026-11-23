"use client";

import { Download, ExternalLink, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DecisionChip, LevelBadge, SourceKindIcon } from "@/components/app/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadReportPdf } from "@/lib/analysis/api";
import { AnalysisError, type ReportSummary } from "@/lib/analysis/types";
import { formatDate, langProps, relativeTime } from "@/lib/app/format";

/**
 * Reports as a table on wide screens and as cards on phones. Clicking a row opens the
 * report; the title is also a real link for keyboards and screen readers.
 */
export function ReportsTable({
  reports,
  onDelete,
  showMenu = false,
  compact = false,
  caption,
}: {
  reports: ReportSummary[];
  onDelete?: (report: ReportSummary) => void;
  showMenu?: boolean;
  /** For narrow cards: the closest source shows under the title instead of in its own column. */
  compact?: boolean;
  caption: string;
}) {
  const router = useRouter();
  const open = (id: string) => router.push(`/dashboard/reports/${id}`);

  return (
    <>
      <div className="-mx-1 hidden overflow-x-auto md:block">
        <table
          className={`w-full border-separate ${compact ? "min-w-[560px]" : "min-w-[720px]"} border-spacing-0 text-sm`}
        >
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="text-muted-foreground text-left text-xs">
              <th scope="col" className="border-border border-b px-3 pb-2.5 font-medium">
                Title
              </th>
              {!compact && (
                <th scope="col" className="border-border border-b px-3 pb-2.5 font-medium">
                  Closest source
                </th>
              )}
              <th scope="col" className="border-border border-b px-3 pb-2.5 font-medium">
                Level
              </th>
              <th scope="col" className="border-border border-b px-3 pb-2.5 font-medium">
                Reviewer decision
              </th>
              <th scope="col" className="border-border border-b px-3 pb-2.5 text-right font-medium">
                Date
              </th>
              {showMenu && (
                <th scope="col" className="border-border w-10 border-b pb-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr
                key={report.id}
                onClick={() => open(report.id)}
                className="group hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <td className="border-border max-w-72 border-b px-3 py-3">
                  <div className="flex items-center gap-2.5">
                    <SourceKindIcon kind={report.sourceKind} />
                    <Link
                      href={`/dashboard/reports/${report.id}`}
                      onClick={(e) => e.stopPropagation()}
                      {...langProps(report.title)}
                      className="bn-aware truncate font-medium group-hover:underline"
                    >
                      {report.title}
                    </Link>
                  </div>
                  {compact && report.topSourceTitle && (
                    <p
                      {...langProps(report.topSourceTitle)}
                      className="bn-aware text-muted-foreground mt-0.5 truncate pl-6.5 text-xs"
                    >
                      Closest: {report.topSourceTitle}
                    </p>
                  )}
                </td>
                {!compact && (
                  <td className="border-border text-muted-foreground max-w-64 border-b px-3 py-3">
                    <span {...langProps(report.topSourceTitle)} className="bn-aware clamp-2">
                      {report.topSourceTitle ?? "No similar report"}
                    </span>
                  </td>
                )}
                <td className="border-border border-b px-3 py-3">
                  <LevelBadge level={report.level} value={report.overall} />
                </td>
                <td className="border-border border-b px-3 py-3">
                  <DecisionChip status={report.reviewStatus} />
                </td>
                <td className="border-border text-muted-foreground border-b px-3 py-3 text-right whitespace-nowrap">
                  <time dateTime={report.createdAt} title={formatDate(report.createdAt)}>
                    {relativeTime(report.createdAt)}
                  </time>
                </td>
                {showMenu && (
                  <td
                    className="border-border border-b py-3 pr-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RowMenu report={report} onDelete={onDelete} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden" aria-label={caption}>
        {reports.map((report) => (
          <li key={report.id} className="border-border relative rounded-2xl border p-4">
            <div className="flex items-start gap-3">
              <SourceKindIcon kind={report.sourceKind} className="mt-1" />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/dashboard/reports/${report.id}`}
                  {...langProps(report.title)}
                  className="bn-aware block font-medium after:absolute after:inset-0"
                >
                  {report.title}
                </Link>
                {report.topSourceTitle && (
                  <p
                    {...langProps(report.topSourceTitle)}
                    className="bn-aware text-muted-foreground clamp-2 mt-0.5 text-sm"
                  >
                    Closest: {report.topSourceTitle}
                  </p>
                )}
              </div>
              {showMenu && (
                <div className="relative z-10">
                  <RowMenu report={report} onDelete={onDelete} />
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LevelBadge level={report.level} value={report.overall} size="sm" />
              <DecisionChip status={report.reviewStatus} />
              <time dateTime={report.createdAt} className="text-muted-foreground ml-auto text-xs">
                {relativeTime(report.createdAt)}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function RowMenu({
  report,
  onDelete,
}: {
  report: ReportSummary;
  onDelete?: (report: ReportSummary) => void;
}) {
  async function download() {
    try {
      await downloadReportPdf(report.id);
    } catch (err) {
      toast.error(err instanceof AnalysisError ? err.message : "The PDF could not be created.");
    }
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-8 cursor-pointer place-items-center rounded-lg"
          aria-label={`Actions for ${report.title}`}
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/reports/${report.id}`}>
            <ExternalLink aria-hidden />
            Open
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={download}>
          <Download aria-hidden />
          Download PDF
        </DropdownMenuItem>
        {onDelete && (report.reviewStatus ?? "pending") === "pending" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onDelete(report)}
              className="text-danger [&_svg]:!text-danger"
            >
              <Trash2 aria-hidden />
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
