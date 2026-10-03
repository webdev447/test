// One wording, everywhere a stats page shows historical-frequency data — so
// the required disclaimer (and the banned "guarantee/predict" phrasing it
// rules out) can't drift between pages.
export default function StatsDisclaimer() {
  return (
    <p className="text-xs leading-5 text-foreground-muted">
      * ข้อมูลทั้งหมดเป็นสถิติจากผลสลากย้อนหลัง ใช้สำหรับการศึกษาและดูข้อมูลเท่านั้น
      สถิติในอดีตไม่สามารถรับประกันผลรางวัลในอนาคตได้
    </p>
  );
}
