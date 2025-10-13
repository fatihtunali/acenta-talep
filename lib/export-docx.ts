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
  PageBreak,
  ShadingType,
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

function linesToParagraphs(text: string, justify: boolean = false): Paragraph[] {
  const lines = (text || "").split(/\r?\n/);
  return lines
    .filter((l) => l.trim().length > 0)
    .map(
      (l) =>
        new Paragraph({
          children: [new TextRun({ text: l.trim(), size: 22 })],
          spacing: { after: 140, line: 360 },
          alignment: justify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
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
          children: [new TextRun({ text: l.replace(/^[-*•]\s*/, ""), size: 22 })],
          spacing: { after: 100, line: 360 },
        })
    );
}

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
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
                transformation: { width: 282, height: 95 },
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
        border: {
          top: {
            color: "4F46E5",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
        spacing: { before: 200 },
        children: [
          new TextRun({
            text: "Funny Tourism",
            bold: true,
            color: "1F2937",
            size: 18
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: "Mehmet Akif Ersoy Mah. Hanımeli Sok No 5/B, Uskudar - Istanbul",
            color: "6B7280",
            size: 16
          }),
        ],
        spacing: { after: 40 },
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: website, color: "4F46E5", size: 16 }),
          new TextRun({ text: " | ", color: "6B7280", size: 16 }),
          new TextRun({ text: email, color: "4F46E5", size: 16 }),
        ],
      }),
    ],
  });

  const body: (Paragraph | Table)[] = [];

  // Title - split if contains colon
  if (tourName.includes(':')) {
    const [mainTitle, subTitle] = tourName.split(':').map(s => s.trim());
    body.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: mainTitle, bold: true, size: 36, color: "312E81" })],
        spacing: { after: 120 },
        border: {
          bottom: {
            color: "4F46E5",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
      })
    );
    body.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: subTitle, bold: true, size: 28, color: "4F46E5" })],
        spacing: { after: 160, before: 120 },
      })
    );
  } else {
    body.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: tourName || "Itinerary", bold: true, size: 36, color: "312E81" })],
        spacing: { after: 160 },
        border: {
          bottom: {
            color: "4F46E5",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
      })
    );
  }

  // Duration
  if (duration) {
    body.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: duration, italics: true, color: "6B7280", size: 24 })],
        spacing: { after: 240 },
      })
    );
  }

  // Day by day
  days.forEach((d, index) => {
    // Add page break before each day (except the first one) for better readability
    if (index > 0 && index % 3 === 0) {
      body.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }

    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 120 },
        children: [
          new TextRun({ text: d.title || `Day ${d.dayNumber}`, bold: true, size: 26, color: "1F2937" }),
          new TextRun({ text: d.mealCode ? `  ${d.mealCode}` : "", color: "6B7280", size: 22 }),
        ],
      })
    );
    body.push(...linesToParagraphs(d.description, true)); // Justified text for professional look
  });

  // Sections: Inclusions, Exclusions
  // Page break before inclusions for better separation
  body.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  );

  if (inclusions) {
    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 140 },
        children: [new TextRun({ text: "INCLUSIONS", bold: true, size: 28, color: "312E81" })],
        border: {
          bottom: {
            color: "4F46E5",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 8,
          },
        },
      })
    );
    body.push(...linesToBullets(inclusions));
  }

  if (exclusions) {
    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 140 },
        children: [new TextRun({ text: "EXCLUSIONS", bold: true, size: 28, color: "312E81" })],
        border: {
          bottom: {
            color: "4F46E5",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 8,
          },
        },
      })
    );
    body.push(...linesToBullets(exclusions));
  }

  // Accommodation table
  if (hotels && hotels.length > 0) {
    // Page break before accommodation section
    body.push(
      new Paragraph({
        children: [new PageBreak()],
      })
    );

    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 140 },
        children: [new TextRun({ text: "ACCOMMODATION", bold: true, size: 28, color: "312E81" })],
        border: {
          bottom: {
            color: "4F46E5",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 8,
          },
        },
      })
    );

    const headerRow = new TableRow({
      tableHeader: true,
      children: ["City", "Check-In", "Check-Out", "Nights"].map(
        (h) =>
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 140, bottom: 140, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: h, bold: true, color: "000000", size: 22 })],
              }),
            ],
          })
      ),
    });

    const rows = hotels.map(
      (h, idx) =>
        new TableRow({
          children: [
            h.city,
            new Date(h.checkIn).toLocaleDateString("en-GB"),
            new Date(h.checkOut).toLocaleDateString("en-GB"),
            `${h.nights} ${h.nights === 1 ? 'Night' : 'Nights'}`,
          ].map((v, colIdx) =>
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 120, bottom: 120, left: 120, right: 120 },
              children: [
                new Paragraph({
                  alignment: colIdx === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                  children: [new TextRun({ text: String(v), size: 22, color: "000000" })],
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

    // Add footnote for accommodation
    body.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "* Accommodation will be provided in selected hotel category",
            size: 18,
            color: "6B7280",
            italics: true,
          }),
        ],
        spacing: { before: 100, after: 40 },
      })
    );
    body.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "* Standard hotel check-in time: 14:00 | Standard check-out time: 12:00",
            size: 18,
            color: "6B7280",
            italics: true,
          }),
        ],
        spacing: { after: 80 },
      })
    );
  }

  // Hotel options by category table
  if (hotelsByCategory && hotelsByCategory.length > 0) {
    // Detect which categories have hotels (same logic as itinerary page)
    type HotelCategoryLabel = '3 stars' | '4 stars' | '5 stars';
    const availableCategories: HotelCategoryLabel[] = [];
    (['3 stars', '4 stars', '5 stars'] as HotelCategoryLabel[]).forEach(category => {
      const hasHotels = hotelsByCategory.some(cityData =>
        cityData.categories[category]?.length > 0
      );
      if (hasHotels) {
        availableCategories.push(category);
      }
    });

    if (availableCategories.length > 0) {
      body.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 140 },
          children: [new TextRun({ text: "HOTEL OPTIONS", bold: true, size: 28, color: "312E81" })],
          border: {
            bottom: {
              color: "4F46E5",
              space: 1,
              style: BorderStyle.SINGLE,
              size: 8,
            },
          },
        })
      );

      const categoryLabels: Record<HotelCategoryLabel, string> = {
        '3 stars': '3-Star Hotels',
        '4 stars': '4-Star Hotels',
        '5 stars': '5-Star Hotels',
      };

      const headers = ["City", ...availableCategories.map(cat => categoryLabels[cat])];
      const columnWidth = availableCategories.length > 0 ? (85 / availableCategories.length) : 28;

      const headerRow = new TableRow({
        tableHeader: true,
        children: headers.map(
          (h, i) =>
            new TableCell({
              width: { size: i === 0 ? 15 : columnWidth, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 140, bottom: 140, left: 120, right: 120 },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: h, bold: true, color: "000000", size: 22 })]
                }),
              ],
            })
        ),
      });

      const rows = hotelsByCategory.map((entry, idx) => {
        const cellTexts: string[] = [entry.city];
        availableCategories.forEach(cat => {
          cellTexts.push((entry.categories[cat] || []).join(", ") || "-");
        });

        return new TableRow({
          children: cellTexts.map((t, i) =>
            new TableCell({
              width: { size: i === 0 ? 15 : columnWidth, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
              margins: { top: 120, bottom: 120, left: 120, right: 120 },
              children: [
                new Paragraph({
                  alignment: i === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
                  children: [new TextRun({ text: t, size: 20, color: "000000" })]
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

      // Add footnote for hotel options
      body.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "* Final hotel selection will be based on your chosen category and availability",
              size: 18,
              color: "6B7280",
              italics: true,
            }),
          ],
          spacing: { before: 100, after: 80 },
        })
      );
    }
  }

  // Package Rates table
  if (hotelCategoryPricing && hotelCategoryPricing.length > 0) {
    // Detect which categories have hotels (same logic as Hotel Options)
    type HotelCategoryLabel = '3 stars' | '4 stars' | '5 stars';
    const availablePricingCategories: HotelCategoryLabel[] = [];
    (['3 stars', '4 stars', '5 stars'] as HotelCategoryLabel[]).forEach(category => {
      const hasHotels = hotelsByCategory?.some(cityData =>
        cityData.categories[category]?.length > 0
      );
      if (hasHotels) {
        availablePricingCategories.push(category);
      }
    });

    const three = hotelCategoryPricing.find((c) => c.category === "3 stars");
    const four = hotelCategoryPricing.find((c) => c.category === "4 stars");
    const five = hotelCategoryPricing.find((c) => c.category === "5 stars");
    const slabCount = three?.pricingSlabs?.length || four?.pricingSlabs?.length || five?.pricingSlabs?.length || 0;

    if (slabCount > 0 && availablePricingCategories.length > 0) {
      body.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 140 },
          children: [new TextRun({ text: "PACKAGE RATES", bold: true, size: 28, color: "312E81" })],
          border: {
            bottom: {
              color: "4F46E5",
              space: 1,
              style: BorderStyle.SINGLE,
              size: 8,
            },
          },
        })
      );

      const categoryLabels: Record<HotelCategoryLabel, string> = {
        '3 stars': '3-Star Hotels',
        '4 stars': '4-Star Hotels',
        '5 stars': '5-Star Hotels',
      };

      const headers = ["PAX / PP in DBL", ...availablePricingCategories.map(cat => categoryLabels[cat])];
      const columnWidth = availablePricingCategories.length > 0 ? (70 / availablePricingCategories.length) : 26.666;

      const headerRow = new TableRow({
        tableHeader: true,
        children: headers.map((h, i) =>
          new TableCell({
            width: { size: i === 0 ? 30 : columnWidth, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 140, bottom: 140, left: 120, right: 120 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: h, bold: true, color: "000000", size: 22 })]
              })
            ],
          })
        ),
      });

      const rows: TableRow[] = [];
      for (let i = 0; i < slabCount; i++) {
        const pax = three?.pricingSlabs?.[i]?.pax ?? four?.pricingSlabs?.[i]?.pax ?? five?.pricingSlabs?.[i]?.pax ?? 0;

        const cellValues: string[] = [`${pax} PAX`];
        availablePricingCategories.forEach(cat => {
          let price = 0;
          if (cat === '3 stars') price = three?.pricingSlabs?.[i]?.pricePerPerson ?? 0;
          else if (cat === '4 stars') price = four?.pricingSlabs?.[i]?.pricePerPerson ?? 0;
          else if (cat === '5 stars') price = five?.pricingSlabs?.[i]?.pricePerPerson ?? 0;
          cellValues.push(price ? `€${price}` : "-");
        });

        rows.push(
          new TableRow({
            children: cellValues.map((txt, col) =>
              new TableCell({
                width: { size: col === 0 ? 30 : columnWidth, type: WidthType.PERCENTAGE },
                verticalAlign: VerticalAlign.CENTER,
                margins: { top: 120, bottom: 120, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: txt,
                        size: 22,
                        color: "000000",
                        bold: col > 0,
                      })
                    ]
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

      // Add footnotes for pricing
      body.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "* Prices are per person in Euro and may vary based on season and availability",
              size: 18,
              color: "6B7280",
              italics: true,
            }),
          ],
          spacing: { before: 100, after: 40 },
        })
      );
      body.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "* Hotel category will be confirmed at time of booking",
              size: 18,
              color: "6B7280",
              italics: true,
            }),
          ],
          spacing: { after: 80 },
        })
      );
    }
  }

  // Important Information (after tables)
  if (information) {
    body.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 140 },
        children: [new TextRun({ text: "IMPORTANT INFORMATION", bold: true, size: 28, color: "312E81" })],
        border: {
          bottom: {
            color: "4F46E5",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 8,
          },
        },
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
