import { useMemo } from "react";
import { ArrowRight, BookOpen, Plus, TrendingUp } from "lucide-react";
import { calculateSemester, calculateSubject, formatPoints, SEMESTERS, semesterLabel, type GradebookData } from "../lib/gradebook";

export function Dashboard({ data, average, onAddGrade, onOpenSubjects, onShowCalculation }: { data: GradebookData; average: number | null; onAddGrade: () => void; onOpenSubjects: () => void; onShowCalculation: () => void }) {
 const subjects = useMemo(() => data.subjects.slice().sort((a,b)=>Number(b.courseType==="Leistungsfach")-Number(a.courseType==="Leistungsfach")), [data.subjects]);
 const semesters = useMemo(() => SEMESTERS.map((semester)=>({semester,...calculateSemester(data,semester)})), [data]);
 const latest = [...semesters].reverse().find((item)=>item.average!==null);
 return <>
  <section className="page-heading"><h1>Dein Abi <span>im &Uuml;berblick</span></h1><button className="button button-primary" onClick={onAddGrade}><Plus size={16}/> Note eintragen</button></section>
  <section className="metric-grid grade-metrics dashboard-metrics">
   <article className={`metric-card main-metric ${average === null ? "neutral" : average >= 12 ? "good" : average >= 8 ? "mid" : "low"}`}><div className="metric-top"><span>Gesamtdurchschnitt</span><TrendingUp size={16}/></div><div className="metric-value">{formatPoints(average,2)}<span> Punkte</span></div><div className="metric-foot">Gewichtet aus belegten Fächern und Halbjahren</div></article>
   <article className="metric-card"><div className="metric-top"><span>{latest?`Letztes Halbjahr · ${semesterLabel(latest.semester)}`:"Halbjahresdurchschnitt"}</span><BookOpen size={16}/></div><div className="metric-value">{formatPoints(latest?.average??null,2)}<span> Punkte</span></div><div className="metric-foot">{latest?`${latest.subjectCount} Fächer berücksichtigt`:"Noch keine Noten erfasst"}</div></article>
  </section>
  <section className="panel semester-overview dashboard-semesters"><div className="panel-heading"><div><h2>Halbjahre im Vergleich</h2><p>Veränderung jeweils zum vorherigen Halbjahr.</p></div><button className="text-button" onClick={onShowCalculation}>Rechenweg</button></div>
   <div className="semester-bars">{semesters.map((item,index)=>{const previous=semesters[index-1]?.average;const change=item.average===null||previous==null?null:item.average-previous;return <div className="semester-bar" key={item.semester}><div className="semester-bar-top"><span>{semesterLabel(item.semester)}</span><strong>{formatPoints(item.average,2)}</strong></div><div className="semester-track"><span style={{width:`${(item.average??0)/15*100}%`}}/></div><small>{change===null?(item.average===null?"Noch keine Noten":"Erstes erfasstes Halbjahr"):`${change>=0?"+":""}${formatPoints(change,2)} Punkte zum Vorhalbjahr`}</small></div>;})}</div>
  </section>
  <article className="panel dashboard-subject-panel"><div className="panel-heading"><div><h2>Fächer</h2></div><button className="text-button" onClick={onOpenSubjects}>Fächer verwalten <ArrowRight size={14}/></button></div><div className="table-scroll"><table className="grades-table"><thead><tr><th>FACH</th><th>KURSART</th><th>H1</th><th>H2</th><th>H3</th><th>H4</th></tr></thead><tbody>{subjects.map((subject)=><tr key={subject.id}><td><span className="subject-name">{subject.name}</span></td><td><span className={`course-type-pill ${subject.courseType==="Leistungsfach"?"lk":"gk"}`}>{subject.courseType==="Leistungsfach"?"LK":"GK"}</span></td>{SEMESTERS.map((semester)=>{const result=calculateSubject(subject,data.performances,semester);return <td key={semester}>{formatPoints(result.average,1)}</td>;})}</tr>)}</tbody></table>{subjects.length===0&&<p className="dashboard-empty">Noch keine Fächer angelegt. Füge ein Fach hinzu, um deine Noten zu erfassen.</p>}</div></article>
 </>;
}
