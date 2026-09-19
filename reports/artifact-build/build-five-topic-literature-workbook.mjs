import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = "C:/Users/ansh0/OneDrive/Documents/medical research analysis/outputs/five-topic-literature-links";
const sourcePath = "C:/Users/ansh0/Downloads/clinical_topics_literature_batch_1.xlsx";
const sourceInput = await FileBlob.load(sourcePath);
await SpreadsheetFile.importXlsx(sourceInput);

const rows = [
  {
    topic: "Achalasia endoscopic and surgical therapy",
    guideline: "ACG Clinical Guidelines: Diagnosis and Management of Achalasia",
    guidelineUrl: "https://pmc.ncbi.nlm.nih.gov/articles/PMC9896940/",
    guidelineNote: "Open-access ACG guideline; PMID 32773454.",
    article1: "Endoscopic or surgical myotomy in idiopathic achalasia",
    article1Url: "https://pubmed.ncbi.nlm.nih.gov/31800987/",
    article2: "Systematic review and network meta-analysis of achalasia treatments",
    article2Url: "https://doi.org/10.1016/S2468-1253(20)30296-X",
    evidenceType: "Guideline, RCT, systematic review/meta-analysis",
  },
  {
    topic: "Acute bacterial meningitis adjunctive dexamethasone",
    guideline: "WHO guidelines on meningitis diagnosis, treatment and care",
    guidelineUrl: "https://www.who.int/publications/i/item/9789240108042",
    guidelineNote: "WHO guideline page; 2025 recommendations include corticosteroid timing.",
    article1: "Adjunctive dexamethasone in bacterial meningitis: individual patient data meta-analysis",
    article1Url: "https://pubmed.ncbi.nlm.nih.gov/20138011/",
    article2: "Corticosteroids for acute bacterial meningitis, Cochrane review",
    article2Url: "https://pubmed.ncbi.nlm.nih.gov/26362566/",
    evidenceType: "Guideline, meta-analysis, Cochrane review",
  },
  {
    topic: "Acute bacterial meningitis empiric therapy and dexamethasone",
    guideline: "NICE NG240: Meningitis (bacterial) and meningococcal disease",
    guidelineUrl: "https://www.nice.org.uk/guidance/ng240",
    guidelineNote: "NICE guideline page; covers recognition, antibiotics and dexamethasone.",
    article1: "Corticosteroids for acute bacterial meningitis, Cochrane review",
    article1Url: "https://pubmed.ncbi.nlm.nih.gov/26362566/",
    article2: "Dexamethasone in adults with bacterial meningitis",
    article2Url: "https://pubmed.ncbi.nlm.nih.gov/12432041/",
    evidenceType: "Guideline, Cochrane review, RCT",
  },
  {
    topic: "Acute liver failure transplant referral",
    guideline: "EASL Clinical Practical Guidelines on acute fulminant liver failure",
    guidelineUrl: "https://pubmed.ncbi.nlm.nih.gov/28417882/",
    guidelineNote: "EASL guideline record; includes emergency management and transplant referral.",
    article1: "Acute Liver Failure Guidelines, American Journal of Gastroenterology",
    article1Url: "https://pubmed.ncbi.nlm.nih.gov/37306377/",
    article2: "Acute liver failure: a practical update",
    article2Url: "https://www.jhep-reports.eu/article/S2589-5559(24)00158-0/fulltext",
    evidenceType: "Guideline, clinical guideline update, review",
  },
  {
    topic: "Acute myeloid leukemia venetoclax azacitidine",
    guideline: "European LeukemiaNet 2022 AML recommendations",
    guidelineUrl: "https://ashpublications.org/blood/article/140/12/1345/485817/Diagnosis-and-management-of-AML-in-adults-2022",
    guidelineNote: "ELN expert recommendations for AML diagnosis and management.",
    article1: "Azacitidine and venetoclax in previously untreated AML",
    article1Url: "https://pubmed.ncbi.nlm.nih.gov/32786187/",
    article2: "Venetoclax and azacitidine systematic review/meta-analysis",
    article2Url: "https://doi.org/10.1080/16078454.2023.2198098",
    evidenceType: "Guideline/recommendations, pivotal trial, systematic review/meta-analysis",
  },
];

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Literature links");
sheet.showGridLines = false;

sheet.getRange("A2").values = [["Five clinical topics with available guidelines and articles"]];
sheet.getRange("A3").values = [["Built from the supplied batch workbook and refreshed with public guideline/article URLs. Links should still be clinically reviewed before release."]];

const headers = [
  "Topic",
  "Guideline source",
  "Guideline URL",
  "Guideline note",
  "Article 1",
  "Article 1 URL",
  "Article 2",
  "Article 2 URL",
  "Evidence type",
];
const values = rows.map((r) => [
  r.topic,
  r.guideline,
  r.guidelineUrl,
  r.guidelineNote,
  r.article1,
  r.article1Url,
  r.article2,
  r.article2Url,
  r.evidenceType,
]);

sheet.getRange("A5:I5").values = [headers];
sheet.getRange("A6:I10").values = values;
sheet.tables.add("A5:I10", true, "LiteratureLinks");

sheet.getRange("A2:I2").format.font = { name: "Arial", size: 14, bold: true, color: "#111827" };
sheet.getRange("A3:I3").format.font = { name: "Arial", size: 10, italic: true, color: "#4B5563" };
sheet.getRange("A5:I5").format = {
  fill: "#14532D",
  font: { name: "Arial", size: 10, bold: true, color: "#FFFFFF" },
};
sheet.getRange("A6:I10").format.font = { name: "Arial", size: 10, color: "#111827" };
sheet.getRange("A5:I10").format.verticalAlignment = "center";
sheet.getRange("A5:I10").format.wrapText = true;
sheet.getRange("A5:I10").format.borders = { preset: "all", style: "thin", color: "#D1D5DB" };
sheet.getRange("C6:C10").format.font = { name: "Arial", size: 10, color: "#0563C1", underline: true };
sheet.getRange("F6:F10").format.font = { name: "Arial", size: 10, color: "#0563C1", underline: true };
sheet.getRange("H6:H10").format.font = { name: "Arial", size: 10, color: "#0563C1", underline: true };

sheet.freezePanes.freezeRows(5);
sheet.getRange("A:I").format.autofitColumns();
sheet.getRange("A:A").format.columnWidth = 42;
sheet.getRange("B:B").format.columnWidth = 44;
sheet.getRange("C:C").format.columnWidth = 48;
sheet.getRange("D:D").format.columnWidth = 48;
sheet.getRange("E:E").format.columnWidth = 52;
sheet.getRange("F:F").format.columnWidth = 42;
sheet.getRange("G:G").format.columnWidth = 52;
sheet.getRange("H:H").format.columnWidth = 42;
sheet.getRange("I:I").format.columnWidth = 34;
sheet.getRange("6:10").format.rowHeight = 78;

workbook.recalculate();

const tableCheck = await workbook.inspect({
  kind: "table",
  range: "Literature links!A5:I10",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 9,
});
console.log(tableCheck.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

await fs.mkdir(outputDir, { recursive: true });
const preview = await workbook.render({ sheetName: "Literature links", range: "A1:I10", scale: 1, format: "png" });
await fs.writeFile(`${outputDir}/preview.png`, new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/clinical_topics_literature_5_with_links.xlsx`);
