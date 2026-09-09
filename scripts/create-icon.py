from PIL import Image, ImageDraw
from pathlib import Path
root = Path(__file__).resolve().parent.parent
im = Image.new('RGBA', (512, 512), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
d.rounded_rectangle((20, 20, 492, 492), radius=108, fill='#131C2C')
d.rounded_rectangle((98, 113, 414, 411), radius=42, fill='#D8E8FA')
d.rounded_rectangle((98, 113, 414, 215), radius=42, fill='#85B9FF')
d.rectangle((98, 173, 414, 215), fill='#85B9FF')
for x in (168, 344):
    d.rounded_rectangle((x-13, 83, x+13, 155), radius=13, fill='#D8E8FA')
d.line((157, 303, 224, 355, 355, 253), fill='#174174', width=32, joint='curve')
for x,y in ((157,303),(355,253)):
    d.ellipse((x-16,y-16,x+16,y+16), fill='#174174')
im.save(root / 'assets' / 'extension-icon.png')
