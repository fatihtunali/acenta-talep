"use client";

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  VerticalAlign,
} from "docx";

export interface DayItineraryDoc {
  dayNumber: number;
  title: string;
  mealCode: string;
  description: string;
}

export interface ExportDocxOptions {
  logoPath: string; // e.g. "/images/Funny_Logo.png"
  website: string;  // e.g. "www.funnytourism.com"
  email: string;    // e.g. "info@funnytourism.com"
  tourName: string;
  duration: string;
  days: DayItineraryDoc[];
  inclusions: string;
  exclusions: string;
  information: string;
  // Optional tables
  hotels?: Array<{ city: string; checkIn: string; checkOut: string; nights: number }>;
  hotelsByCategory?: Array<{ city: string; categories: Record<'3 stars'|'4 stars'|'5 stars', string[]> }>;
  hotelCategoryPricing?: Array<{ category: '3 stars'|'4 stars'|'5 stars'; pricingSlabs: Array<{ pax: number; pricePerPerson: number; totalPrice: number }> }>;
}

async function fetchAsUint8Array(path: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

function linesToParagraphs(text: string): Paragraph[] {
  const lines = (text || "").split(/\r?\n/);
  return lines
    .filter((l) => l.trim().length > 0)
    .map(
      (l) =>
        new Paragraph({
          children: [new TextRun({ text: l.trim() })],
          spacing: { after: 120 },
        })
    );
}

function linesToBullets(text: string): Paragraph[] {
  const lines = (text || "").split(/\r?\n/);
  return lines
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map(
      (l) =>
        new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: l.replace(/^[-*]\s*/, "") })],
          spacing: { after: 80 },
        })
    );
}

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
};

export async function exportItineraryToDocx(opts: ExportDocxOptions): Promise<Blob> {
  const {
    logoPath,
    website,
    email,
    tourName,
    duration,
    days,
    inclusions,
    exclusions,
    information,
    hotels,
    hotelsByCategory,
    hotelCategoryPricing,
  } = opts;

  const logoData = await fetchAsUint8Array(logoPath);

  const header = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: logoData
          ? [
              new ImageRun({
                type: "png",
                data: logoData,
                transformation: { width: 600, height: 140 },
              }),
            ]
          : [new TextRun({ text: "", size: 1 })],
        spacing: { after: 120 },
      }),
    ],
  });

  const footer = new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: website, color: "666666", size: 16 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: email, color: "666666", size: 16 })],
      }),
    ],
  });

  const body: (Paragraph | Table)[] = [];

  // Title
  body.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: tourName || "Itinerary", bold: true })],
      spacing: { after: 160 },
    })
  );

  // Duration
  if (duration) {
    body.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: duration, italics: true, color: "555555" })],
        spacing: { after: 200 },
      })
    );
  }

  // Day by day
  days.forEach((d) => {
    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 160, after: 80 },
        children: [
          new TextRun({ text: d.title || `Day ${d.dayNumber}`, bold: true }),
          new TextRun({ text: d.mealCode ? `  ${d.mealCode}` : "" , color: "666666"}),
        ],
      })
    );
    body.push(...linesToParagraphs(d.description));
  });

  // Sections: Inclusions, Exclusions
  if (inclusions) {
    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: "Inclusions", bold: true })],
      })
    );
    body.push(...linesToBullets(inclusions));
  }

  if (exclusions) {
    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: "Exclusions", bold: true })],
      })
    );
    body.push(...linesToBullets(exclusions));
  }

  // Accommodation table
  if (hotels && hotels.length > 0) {
    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 120 },
        children: [new TextRun({ text: "Accommodation", bold: true })],
      })
    );

    const headerRow = new TableRow({
      children: ["City", "Check-In", "Check-Out", "Nights"].map(
        (h) =>
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { fill: "F3F4F6" },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: h, bold: true })],
              }),
            ],
          })
      ),
    });

    const rows = hotels.map(
      (h) =>
        new TableRow({
          children: [
            h.city,
            new Date(h.checkIn).toLocaleDateString("en-GB"),
            new Date(h.checkOut).toLocaleDateString("en-GB"),
            `${h.nights}`,
          ].map((v, idx) =>
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 80, bottom: 80, left: 100, right: 100 },
              children: [
                new Paragraph({
                  alignment: idx === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                  children: [new TextRun(String(v))],
                })
              ],
            })
          ),
        })
    );

    body.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders,
        rows: [headerRow, ...rows],
      })
    );
  }

  // Hotel options by category table
  if (hotelsByCategory && hotelsByCategory.length > 0) {
    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: "Hotel Options by Category", bold: true })],
      })
    );

    const headers = ["City", "3-Star", "4-Star", "5-Star"];
    const headerRow = new TableRow({
      children: headers.map(
        (h, i) =>
          new TableCell({
            width: { size: i === 0 ? 25 : 25, type: WidthType.PERCENTAGE },
            shading: { fill: "F3F4F6" },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: h, bold: true })]
              }),
            ],
          })
      ),
    });

    const rows = hotelsByCategory.map((entry) => {
      const cellTexts = [
        entry.city,
        (entry.categories["3 stars"] || []).join("\n"),
        (entry.categories["4 stars"] || []).join("\n"),
        (entry.categories["5 stars"] || []).join("\n"),
      ];
      return new TableRow({
        children: cellTexts.map((t, i) =>
          new TableCell({
            width: { size: i === 0 ? 25 : 25, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 80, bottom: 80, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                children: [new TextRun({ text: t })]
              })
            ],
          })
        ),
      });
    });

    body.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders,
        rows: [headerRow, ...rows]
      })
    );
  }

  // Package Rates table
  if (hotelCategoryPricing && hotelCategoryPricing.length > 0) {
    // Combine slabs by index; assume same slab count across categories
    const three = hotelCategoryPricing.find((c) => c.category === "3 stars");
    const four = hotelCategoryPricing.find((c) => c.category === "4 stars");
    const five = hotelCategoryPricing.find((c) => c.category === "5 stars");
    const slabCount = three?.pricingSlabs?.length || four?.pricingSlabs?.length || five?.pricingSlabs?.length || 0;

    if (slabCount > 0) {
      body.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
          children: [new TextRun({ text: "Package Rates (PP in DBL)", bold: true })],
        })
      );

      const headerRow = new TableRow({
        children: ["PAX", "3-Star Hotels", "4-Star Hotels", "5-Star Hotels"].map((h, i) =>
          new TableCell({
            width: { size: i === 0 ? 20 : 26.666, type: WidthType.PERCENTAGE },
            shading: { fill: "F3F4F6" },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 100, bottom: 100, left: 100, right: 100 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: h, bold: true })]
              })
            ],
          })
        ),
      });

      const rows: TableRow[] = [];
      for (let i = 0; i < slabCount; i++) {
        const pax = three?.pricingSlabs?.[i]?.pax ?? four?.pricingSlabs?.[i]?.pax ?? five?.pricingSlabs?.[i]?.pax ?? 0;
        const v3 = three?.pricingSlabs?.[i]?.pricePerPerson ?? 0;
        const v4 = four?.pricingSlabs?.[i]?.pricePerPerson ?? 0;
        const v5 = five?.pricingSlabs?.[i]?.pricePerPerson ?? 0;
        rows.push(
          new TableRow({
            children: [
              String(pax),
              v3 ? `€${v3}` : "",
              v4 ? `€${v4}` : "",
              v5 ? `€${v5}` : "",
            ].map((txt, col) =>
              new TableCell({
                width: { size: col === 0 ? 20 : 26.666, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 80, bottom: 80, left: 100, right: 100 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun(txt)]
                  })
                ],
              })
            ),
          })
        );
      }

      body.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: tableBorders,
          rows: [headerRow, ...rows]
        })
      );
    }
  }

  // Important Information (after tables)
  if (information) {
    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
        children: [new TextRun({ text: "Important Information", bold: true })],
      })
    );
    body.push(...linesToBullets(information));
  }

  const doc = new Document({
    sections: [
      {
        headers: { default: header },
        footers: { default: footer },
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 900, left: 720 }, // 720 = 0.5", 900 ~ 0.625"
          },
        },
        children: body,
      },
    ],
  });

  return Packer.toBlob(doc);
}
