"""Rebuild the committed supporter PDF with ReportLab; copy comes from the page/config."""
import json
import re
from html import unescape, escape
from pathlib import Path
from urllib.parse import urlsplit
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle, KeepTogether
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parent.parent
config = json.loads((ROOT / 'data/supporters.json').read_text(encoding='utf-8'))
page = (ROOT / 'toetajad/index.html').read_text(encoding='utf-8')
fonts = Path('C:/Windows/Fonts')
pdfmetrics.registerFont(TTFont('Rae', str(fonts / 'arial.ttf')))
pdfmetrics.registerFont(TTFont('RaeBold', str(fonts / 'arialbd.ttf')))
site_css = (ROOT / 'styles.css').read_text(encoding='utf-8')
ink = colors.HexColor(re.search(r'--coal:\s*(#[0-9a-fA-F]+)', site_css)[1])
gold = colors.HexColor(re.search(r'--gold:\s*(#[0-9a-fA-F]+)', site_css)[1])
body = ParagraphStyle('Body', fontName='Rae', fontSize=10, leading=14.5, textColor=ink, spaceAfter=7)
title = ParagraphStyle('Title', parent=body, fontName='RaeBold', fontSize=25, leading=29, spaceAfter=15)
heading = ParagraphStyle('Heading', parent=body, fontName='RaeBold', fontSize=16, leading=20, spaceBefore=14, spaceAfter=9)
label = ParagraphStyle('Label', parent=body, fontName='RaeBold', fontSize=10.5, leading=15, spaceAfter=3)
small = ParagraphStyle('Small', parent=body, fontSize=8.5, leading=12, textColor=colors.HexColor('#51555c'))
def p(text, style=body): return Paragraph(text, style)
photo = Image(str(ROOT / 'assets/u11-medalid.jpg'), width=190, height=142.5)
header = Table([[ [p('Toeta Rae noori ja kogukonda', title), p('Iga panus aitab luua noortele parema arengukeskkonna ja tuua kodukanti ühiseid elamusi.')], photo ]], colWidths=[310, 195])
header.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(0,0),20),('RIGHTPADDING',(1,0),(1,0),0),('BOTTOMPADDING',(0,0),(-1,-1),12)]))
minimum = config['thankYouMinimum']
story = [header, p('Iga panus loeb', heading), p(f'Vali endale jõukohane summa. Võid toetada 10, 25, 50 või {minimum} euroga või valida muu summa.'), p(f'Vähemalt {minimum} € toetuse eest saad soovi korral FC Rae fännisärgi ja salli. Sinu nõusolekul avaldame klubi veebilehel ka tänuavalduse.'), p('Pärast ülekannet anna oma soovidest teada veebilehe vormiga. Fännikomplektist võid loobuda. Sobiva särgi ja üleandmise lepime eraldi kokku. Vormi saatmine ei kinnita makse laekumist; klubi kontrollib seda enne üleandmist või nime avaldamist.', small), p('Sinu ettevõte. Meie kogukond.', heading)]
business = page.split('id="koostoo"',1)[1].split('</section>',1)[0]
for dt, dd in re.findall(r'<dt>(.*?)</dt><dd>(.*?)</dd>', business, re.S):
    story.append(KeepTogether([p(unescape(dt),label),p(unescape(dd))]))
terms = re.search(r'<p class="support-business-terms">(.*?)</p>',business,re.S)[1]
story += [p(unescape(terms),small), p('<b>Räägime koostööst:</b> info@fcrae.ee'), Spacer(1,8)]
bank=config['bank']
payment = Table([[p(f'<b>{escape(bank["recipient"])}</b><br/>{escape(bank["iban"])}<br/>Selgitus: {escape(bank["reference"])}',body),p('<b>Toeta või räägi koostööst</b><br/><link href="https://fcrae.ee/toetajad/" color="#111316">fcrae.ee/toetajad/</link><br/>MTÜ liikmeks astumine toimub eraldi.',body)]], colWidths=[260,245])
payment.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),gold),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),12),('RIGHTPADDING',(0,0),(-1,-1),12),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
story += [payment]
target=ROOT / urlsplit(config['pdfUrl']).path.lstrip('/')
doc=SimpleDocTemplate(str(target),pagesize=(595.28,841.89),leftMargin=45,rightMargin=45,topMargin=35,bottomMargin=30,title='Toeta Rae SK noori ja kogukonda',author=config['legalName'])
doc.build(story)
print(target)
