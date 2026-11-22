import fs from "node:fs";

const file = "src/components/App.tsx";
let text = fs.readFileSync(file, "utf8");
const replacements = [
  [
    /^: \{\r?\n  subjects: Subject\[\];\r?\n  average: number;\r?\n  onAdd: \(\) => void;\r?\n  onOpenSubjects: \(\) => void;\r?\n  onOpenAbi: \(\) => void;\r?\n  onEditGrade: \(name: string\) => void;\r?\n\}\) \{\r?\n  const topSubjects/m,
    "function LegacyDashboard({ subjects, average, onAdd, onOpenSubjects, onOpenAbi, onEditGrade }: { subjects: Subject[]; average: number; onAdd: () => void; onOpenSubjects: () => void; onOpenAbi: () => void; onEditGrade: (name: string) => void }) {\n  const topSubjects",
  ],
  [
    /^: \{\r?\n  subjects: Subject\[\];\r?\n  onAdd: \(\) => void;\r?\n  onEditGrade: \(name: string\) => void;\r?\n\}\) \{\r?\n  const \[query/m,
    "function LegacySubjectsPage({ subjects, onAdd, onEditGrade }: { subjects: Subject[]; onAdd: () => void; onEditGrade: (name: string) => void }) {\n  const [query",
  ],
  [
    /^: \{ average: number \}\) \{\r?\n  const estimate/m,
    "function LegacyAbiturPage({ average }: { average: number }) {\n  const estimate",
  ],
  [
    /^: \{\r?\n  theme: Theme;\r?\n  onTheme: \(theme: Theme\) => void;\r?\n  onReset: \(\) => void;\r?\n\}\) \{\r?\n  const themes/m,
    "function LegacySettingsPage({ theme, onTheme, onReset }: { theme: Theme; onTheme: (theme: Theme) => void; onReset: () => void }) {\n  const themes",
  ],
  [
    /^: \{ subjects: SchoolSubject\[\]; performances: Performance\[\]; average: number; performanceCount: number; onAddGrade: \(\) => void; onOpenSubjects: \(\) => void; onShowCalculation: \(\) => void \}\) \{\r?\n  const semesterResults/m,
    "function Dashboard({ subjects, performances, average, performanceCount, onAddGrade, onOpenSubjects }: { subjects: SchoolSubject[]; performances: Performance[]; average: number; performanceCount: number; onAddGrade: () => void; onOpenSubjects: () => void }) {\n  const semesterResults",
  ],
  [
    /^: \{ subjects: SchoolSubject\[\]; gradebook: GradebookData; semester: Semester; onSemester: \(semester: Semester\) => void; onAdd: \(\) => void; onEdit: \(subject: SchoolSubject\) => void; onDelete: \(subject: SchoolSubject\) => void; onGrade: \(subject: SchoolSubject, manual\?: boolean\) => void; onWeights: \(subjectId: string, semester: Semester, written: number, oral: number\) => void; onMode: \(subjectId: string, semester: Semester, mode: "individual" \| "manual"\) => void; onPerformanceEdit: \(performance: Performance\) => void; onPerformanceDelete: \(id: string\) => void \}\) \{\r?\n  const \[query/m,
    'function SubjectsPage({ subjects, gradebook, semester, onSemester, onAdd, onEdit, onDelete, onGrade, onWeights, onMode, onPerformanceEdit, onPerformanceDelete }: { subjects: SchoolSubject[]; gradebook: GradebookData; semester: Semester; onSemester: (semester: Semester) => void; onAdd: () => void; onEdit: (subject: SchoolSubject) => void; onDelete: (subject: SchoolSubject) => void; onGrade: (subject: SchoolSubject, manual?: boolean) => void; onWeights: (subjectId: string, semester: Semester, written: number, oral: number) => void; onMode: (subjectId: string, semester: Semester, mode: "individual" | "manual") => void; onPerformanceEdit: (performance: Performance) => void; onPerformanceDelete: (id: string) => void }) {\n  const [query',
  ],
  [
    /^: \{ title: string; result: \{ average: number \| null; count: number; denominator: number \}; weight: number; onWeight: \(value: number\) => void \}\) \{\r?\n  return <div className="area-summary"/m,
    'function AreaSummary({ title, result, weight, onWeight }: { title: string; result: { average: number | null; count: number; denominator: number }; weight: number; onWeight: (value: number) => void }) {\n  return <div className="area-summary"',
  ],
  [
    /^: \{ data: GradebookData; onAddCourse: \(\) => void \}\) \{\r?\n  const \[courses, setCourses\] = useState<AbiturCourseGrade\[]>\(\(\) => data\.subjects\.flatMap/m,
    "function OfficialCalculatorPage({ data, onAddCourse }: { data: GradebookData; onAddCourse: () => void }) {\n  const [courses, setCourses] = useState<AbiturCourseGrade[]>(() => data.subjects.flatMap",
  ],
];
for (const [pattern, replacement] of replacements) {
  if (!pattern.test(text)) continue;
  const next = text.replace(pattern, replacement);
  if (next === text) throw new Error(`Could not repair header: ${pattern}`);
  text = next;
}
fs.writeFileSync(file, text);
