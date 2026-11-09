"""Generate a bright warm indoor/outdoor panorama for offline PBR image-based lighting.
Synthetic HDR, not a Poly Haven photo; optional `npm run assets:hdri` adds CC0 photography.
Uses Radiance scanline RLE; not a low-dynamic-range JPG pretending to be HDR.
"""
import math
from pathlib import Path
W,H=1024,512
DEST=Path(__file__).resolve().parents[1]/'public/hdri/framecraft_studio.hdr'
def rgbe(r,g,b):
    high=max(r,g,b)
    if high<1e-32:return (0,0,0,0)
    mantissa,exponent=math.frexp(high)
    factor=mantissa*256/high
    return tuple(min(255,int(c*factor)) for c in (r,g,b))+(exponent+128,)
def patch(a,e,ca,ce,wa,we):
    da=math.atan2(math.sin(a-ca),math.cos(a-ca))
    return math.exp(-.5*((da/wa)**2+((e-ce)/we)**2))
with DEST.open('wb') as f:
    f.write((f'#?RADIANCE\n# Synthetic Cafe Lumiere warm daylight studio v2\nFORMAT=32-bit_rle_rgbe\n\n-Y {H} +X {W}\n').encode('ascii'))
    for row in range(H):
        channels=[bytearray() for _ in range(4)]
        e=math.pi*(.5-(row+.5)/H)
        sky=max(0,math.sin(e))
        for col in range(W):
            a=(col+.5)/W*2*math.pi-math.pi
            ambient=(.48+.8*sky,.43+.82*sky,.38+.97*sky)
            window=patch(a,e,-1.10,.29,.48,.33)*11.5
            window2=patch(a,e,-.39,.33,.30,.27)*7.0
            key=patch(a,e,-.69,.39,.12,.12)*26
            counter=patch(a,e,1.95,.22,.70,.47)*2.9
            lamp=patch(a,e,.35,-.05,.18,.17)*2.0
            radiance=(ambient[0]+window*.96+window2*1.02+key*1.1+counter*.87+lamp*1.15,
                      ambient[1]+window*.98+window2*.96+key*.95+counter*.94+lamp*.72,
                      ambient[2]+window*1.03+window2*.87+key*.75+counter*1.04+lamp*.44)
            for ch,b in zip(channels,rgbe(*radiance)):ch.append(b)
        f.write(bytes([2,2,W>>8,W&255]))
        for ch in channels:
            for start in range(0,W,128):
                c=ch[start:start+128]
                f.write(bytes([len(c)])+c)
print(f'Synthetic high-dynamic-range panorama: {DEST.stat().st_size:,} bytes')
