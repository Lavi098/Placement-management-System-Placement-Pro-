import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, FileText, Search, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { findPlacementAdminByUserId } from "@/services/placementAdmins";
import { listPlacedStudentsForPlacementAdmin, PlacedStudentRecord } from "@/services/offers";
import { OfferStatus } from "@/models/offers";

type StudentOfferView = {
  id: string;
  company: string;
  role: string;
  ctc: string;
  status: OfferStatus;
  offerType?: string;
  driveDate?: string;
  offerDate?: string;
};

type PlacedStudentView = {
  id: string;
  name: string;
  rollNumber: string;
  email: string;
  branch: string;
  passingYear: string;
  offers: StudentOfferView[];
};

const statusColors: Record<OfferStatus, string> = {
  offered: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  accepted: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  joined: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  declined: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
};

const statusLabel: Record<OfferStatus, string> = {
  offered: "Offered",
  accepted: "Accepted",
  joined: "Joined",
  declined: "Declined",
};

const formatDate = (value: unknown): string => {
  if (!value) return "—";
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  const parsed = new Date(value as string | number);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return "—";
};

const normalizeText = (value?: string | number) => (value ? String(value) : "");

const toStudentView = (record: PlacedStudentRecord): PlacedStudentView => {
  const student = record.student;
  return {
    id: record.studentId,
    name: student?.name || "Unnamed Student",
    rollNumber: student?.rollNumber || "—",
    email: student?.email || "—",
    branch: student?.branch || "—",
    passingYear: student?.passingYear ? String(student.passingYear) : "—",
    offers: record.offers.map((offer) => ({
      id: offer.id,
      company: offer.companyName || "—",
      role: offer.role || "—",
      ctc: offer.ctc || "—",
      status: offer.status,
      offerType: offer.offerType,
      driveDate: formatDate(offer.joiningDate || offer.updatedAt),
      offerDate: formatDate(offer.createdAt),
    })),
  };
};

export default function PlacedStudents() {
  const [selectedStudent, setSelectedStudent] = useState<PlacedStudentView | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const { user } = useAuth();

  const isPlacementAdmin = user?.role === "placement-admin";

  const {
    data: placementAdminRecord,
    isLoading: isLoadingPlacementAdmin,
    error: placementAdminError,
  } = useQuery({
    queryKey: ["placement-admin-record", user?.uid],
    queryFn: () => findPlacementAdminByUserId(user!.uid),
    enabled: Boolean(isPlacementAdmin && user?.uid),
  });

  const {
    data: placedStudents = [],
    isLoading: isLoadingPlacedStudents,
    error: placedStudentsError,
  } = useQuery<PlacedStudentRecord[]>({
    queryKey: ["placed-students", placementAdminRecord?.id],
    queryFn: () =>
      listPlacedStudentsForPlacementAdmin({
        placementAdminId: placementAdminRecord!.id,
        collegeId: placementAdminRecord?.collegeId,
        institutionAdminId: placementAdminRecord?.institutionAdminId,
      }),
    enabled: Boolean(placementAdminRecord?.id),
  });

  const students = useMemo(
    () => placedStudents.map(toStudentView),
    [placedStudents]
  );

  const filteredStudents = useMemo(() => {
    const queryText = searchQuery.toLowerCase();
    return students.filter((student) => {
      const matchesSearch =
        normalizeText(student.name).toLowerCase().includes(queryText) ||
        normalizeText(student.rollNumber).toLowerCase().includes(queryText) ||
        normalizeText(student.email).toLowerCase().includes(queryText);
      const matchesBranch = branchFilter === "all" || student.branch === branchFilter;
      const matchesYear = yearFilter === "all" || student.passingYear === yearFilter;
      return matchesSearch && matchesBranch && matchesYear;
    });
  }, [students, searchQuery, branchFilter, yearFilter]);

  const totalOffers = students.reduce((acc, student) => acc + student.offers.length, 0);
  const uniqueCompanies = new Set(
    students.flatMap((s) => s.offers.map((offer) => offer.company.toLowerCase().trim()))
  ).size;

  const isLoading = isLoadingPlacementAdmin || isLoadingPlacedStudents;

  const showEmptyState =
    !isLoading &&
    !placementAdminError &&
    !placedStudentsError &&
    placementAdminRecord &&
    students.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Placed Students</h1>
          <p className="text-muted-foreground">
            View all students who have accepted or joined offers associated with your department.
          </p>
        </div>
        {!isPlacementAdmin && (
          <Card className="mb-6">
            <CardContent className="py-6">
              <p className="text-muted-foreground">
                You need a placement-admin account to view placed students.
              </p>
            </CardContent>
          </Card>
        )}

        {placementAdminError && (
          <Card className="mb-6">
            <CardContent className="py-6 text-destructive">
              <p>Unable to resolve your placement-admin profile.</p>
            </CardContent>
          </Card>
        )}

        {placedStudentsError && (
          <Card className="mb-6">
            <CardContent className="py-6 text-destructive">
              <p>Failed to load placed students. Please try again.</p>
            </CardContent>
          </Card>
        )}

        {isPlacementAdmin && placementAdminRecord && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-primary">
                    {isLoading ? "…" : students.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Students Placed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-accent">
                    {isLoading ? "…" : totalOffers}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Offers</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-success">
                    {isLoading ? "…" : uniqueCompanies}
                  </div>
                  <p className="text-sm text-muted-foreground">Number of Companies</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Export */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, roll, email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={branchFilter} onValueChange={setBranchFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Branches</SelectItem>
                        <SelectItem value="CSE">CSE</SelectItem>
                        <SelectItem value="IT">IT</SelectItem>
                        <SelectItem value="ECE">ECE</SelectItem>
                        <SelectItem value="ME">ME</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Passing Year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                        <SelectItem value="2025">2025</SelectItem>
                        <SelectItem value="2026">2026</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input placeholder="Min-Max CTC" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="gap-2" disabled>
                      <FileSpreadsheet className="h-4 w-4" />
                      Excel
                    </Button>
                    <Button variant="outline" className="gap-2" disabled>
                      <FileText className="h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                      <TableRow>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Roll Number</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead className="min-w-[300px]">Offers</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-muted-foreground">
                            Loading placed students...
                          </TableCell>
                        </TableRow>
                      )}

                      {!isLoading && filteredStudents.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-muted-foreground">
                            No placed students found for the applied filters.
                          </TableCell>
                        </TableRow>
                      )}

                      {!isLoading &&
                        filteredStudents.map((student) => (
                          <TableRow
                            key={student.id}
                            className="cursor-pointer"
                            onClick={() => setSelectedStudent(student)}
                          >
                            <TableCell className="font-medium">{student.name}</TableCell>
                            <TableCell>{student.rollNumber}</TableCell>
                            <TableCell className="text-muted-foreground">{student.email}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{student.branch}</Badge>
                            </TableCell>
                            <TableCell>{student.passingYear}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-2">
                                {student.offers.slice(0, 2).map((offer) => (
                                  <div
                                    key={offer.id}
                                    className="inline-flex flex-col gap-1 p-2 rounded-md bg-muted border border-border text-xs min-w-[140px]"
                                  >
                                    <div className="font-semibold text-foreground">{offer.company}</div>
                                    <div className="text-muted-foreground">{offer.role}</div>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-medium text-primary">{offer.ctc}</span>
                                      <Badge
                                        variant="outline"
                                        className={`${statusColors[offer.status]} text-[10px] px-1.5 py-0`}
                                      >
                                        {statusLabel[offer.status]}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                                {student.offers.length > 2 && (
                                  <div className="inline-flex items-center justify-center p-2 rounded-md bg-muted border border-border text-xs font-medium text-muted-foreground min-w-[80px]">
                                    +{student.offers.length - 2} more
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Detail Sheet */}
            <Sheet open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
              <SheetContent className="sm:max-w-xl overflow-y-auto">
                {selectedStudent && (
                  <>
                    <SheetHeader>
                      <SheetTitle>{selectedStudent.name}</SheetTitle>
                      <SheetDescription>
                        {selectedStudent.rollNumber} • {selectedStudent.branch} • {selectedStudent.passingYear}
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Email</div>
                        <div className="text-sm font-medium">{selectedStudent.email}</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold mb-3">
                          All Offers ({selectedStudent.offers.length})
                        </div>
                        <div className="space-y-3">
                          {selectedStudent.offers.map((offer) => (
                            <Card key={offer.id}>
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <div className="font-semibold text-foreground">{offer.company}</div>
                                    <div className="text-sm text-muted-foreground">{offer.role}</div>
                                  </div>
                                  <Badge variant="outline" className={statusColors[offer.status]}>
                                    {statusLabel[offer.status]}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <div className="text-muted-foreground">CTC</div>
                                    <div className="font-medium text-primary">{offer.ctc}</div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">Type</div>
                                    <div className="font-medium">{offer.offerType ? offer.offerType.toUpperCase() : "—"}</div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">Drive Date</div>
                                    <div className="font-medium">{offer.driveDate || "—"}</div>
                                  </div>
                                  <div>
                                    <div className="text-muted-foreground">Offer Date</div>
                                    <div className="font-medium">{offer.offerDate || "—"}</div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </SheetContent>
            </Sheet>
          </>
        )}

        {showEmptyState && (
          <Card className="mt-6">
            <CardContent className="py-6 text-muted-foreground">
              <p>No placed students are recorded yet.</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
