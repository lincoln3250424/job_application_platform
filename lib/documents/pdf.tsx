import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { StructuredResume } from "../resumeStructure";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10.5, fontFamily: "Helvetica", color: "#24211C" },
  name: { fontSize: 20, fontWeight: 700, textAlign: "center", marginBottom: 3 },
  contact: { fontSize: 9.5, textAlign: "center", color: "#6C6252", marginBottom: 14 },
  summary: { fontSize: 10.5, marginBottom: 12, lineHeight: 1.4 },
  sectionHeading: {
    fontSize: 12,
    fontWeight: 700,
    marginTop: 14,
    marginBottom: 6,
    borderBottomWidth: 0.75,
    borderBottomColor: "#B9AF95",
    paddingBottom: 3,
  },
  jobRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 2,
  },
  jobTitle: { fontSize: 11, fontWeight: 700 },
  jobDates: { fontSize: 9.5, color: "#6C6252", fontStyle: "italic" },
  bulletRow: { flexDirection: "row", marginBottom: 2, paddingLeft: 4 },
  bulletDot: { width: 10, fontSize: 10.5 },
  bulletText: { flex: 1, fontSize: 10.5, lineHeight: 1.35 },
  eduRow: { marginBottom: 5 },
  eduTitle: { fontSize: 11, fontWeight: 700 },
  eduDetail: { fontSize: 10 },
  skills: { fontSize: 10.5, lineHeight: 1.4 },
});

function contactLine(resume: StructuredResume): string {
  return [
    resume.contact.email,
    resume.contact.phone,
    resume.contact.location,
    ...(resume.contact.links || []),
  ]
    .filter(Boolean)
    .join("   ·   ");
}

function ResumeDocument({ resume }: { resume: StructuredResume }) {
  const contact = contactLine(resume);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{resume.name}</Text>
        {contact && <Text style={styles.contact}>{contact}</Text>}
        {resume.summary && <Text style={styles.summary}>{resume.summary}</Text>}

        {resume.experience.length > 0 && (
          <View>
            <Text style={styles.sectionHeading}>Experience</Text>
            {resume.experience.map((job, i) => (
              <View key={i}>
                <View style={styles.jobRow}>
                  <Text style={styles.jobTitle}>
                    {job.title} — {job.company}
                  </Text>
                  {job.dates && <Text style={styles.jobDates}>{job.dates}</Text>}
                </View>
                {job.bullets.map((b, j) => (
                  <View style={styles.bulletRow} key={j}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {resume.education.length > 0 && (
          <View>
            <Text style={styles.sectionHeading}>Education</Text>
            {resume.education.map((edu, i) => (
              <View style={styles.eduRow} key={i}>
                <Text style={styles.eduTitle}>{edu.institution}</Text>
                {(edu.detail || edu.dates) && (
                  <Text style={styles.eduDetail}>
                    {[edu.detail, edu.dates].filter(Boolean).join("   ·   ")}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {resume.skills.length > 0 && (
          <View>
            <Text style={styles.sectionHeading}>Skills</Text>
            <Text style={styles.skills}>{resume.skills.join("   ·   ")}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

export async function buildResumePdf(resume: StructuredResume): Promise<Buffer> {
  return renderToBuffer(<ResumeDocument resume={resume} />);
}
