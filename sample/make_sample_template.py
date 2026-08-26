"""Builds a realistic sample fillable certificate PDF for testing/demo purposes.
Run: python sample/make_sample_template.py
Produces: sample/certificate_template.pdf
"""
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import landscape, A4
from reportlab.lib.colors import Color

OUT = "sample/certificate_template.pdf"
W, H = landscape(A4)

c = canvas.Canvas(OUT, pagesize=(W, H))
navy = Color(0.05, 0.25, 0.55)

# Decorative border
c.setLineWidth(4)
c.setStrokeColor(navy)
c.rect(20, 20, W - 40, H - 40)
c.setLineWidth(1)
c.rect(30, 30, W - 60, H - 60)

c.setFont("Times-Bold", 34)
c.setFillColor(navy)
c.drawCentredString(W / 2, H - 120, "CERTIFICATE OF PARTICIPATION")

c.setFont("Times-Roman", 16)
c.setFillColorRGB(0.15, 0.15, 0.15)
c.drawCentredString(W / 2, H - 170, "This certificate is proudly awarded to")

c.setFont("Times-Roman", 14)
c.drawCentredString(W / 2, H - 275, "for outstanding participation in IEEE WAMS 2026,")
c.drawCentredString(W / 2, H - 300, "held on 26th August 2026.")

# The one and only fillable field: NAME_FIELD.
# Font/size/color here are what the app must preserve exactly.
form = c.acroForm
field_w, field_h = 520, 40
form.textfield(
    name="NAME_FIELD",
    tooltip="Recipient name",
    x=(W - field_w) / 2,
    y=H - 235,
    width=field_w,
    height=field_h,
    borderStyle="underlined",
    borderWidth=1,
    borderColor=navy,
    fillColor=None,
    textColor=navy,
    fontName="Times-Bold",
    fontSize=24,
    value="",
    maxlen=60,
    fieldFlags="doNotScroll",
)

c.showPage()
c.save()
print(f"Wrote {OUT}")
