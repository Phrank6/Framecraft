"""Deterministic, locally generated PBR-ish texture maps for the Framecraft café.
All textures are synthetic artwork, not photos; zero external downloads or license risks.
Requires numpy and Pillow (only for generating assets, not running the web app).
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy.ndimage import gaussian_filter

OUT=Path(__file__).resolve().parents[1]/'public/textures'
OUT.mkdir(parents=True,exist_ok=True)
SEED=71026
rng=np.random.default_rng(SEED)
N=768

def smooth_noise(h,w,sigma,seed_offset=0):
    noise=np.random.default_rng(SEED+seed_offset).random((h,w)).astype(np.float32)
    a=gaussian_filter(noise,sigma,mode='wrap')
    return (a-a.mean())/(a.std()+1e-7)
def save_rgb(name, data):
    im=Image.fromarray(np.uint8(np.clip(data,0,255)), 'RGB')
    im.save(OUT/name, optimize=True)
    print(name, (OUT/name).stat().st_size)

y,x=np.mgrid[0:N,0:N].astype(np.float32)
# Warm grained oak veneer: anisotropic multiscale turbulence, occasional knots.
warp=smooth_noise(N,N,28,1)*6 + smooth_noise(N,N,75,2)*14
bands=np.sin((y+warp)*.27+1.5*np.sin(x*.009))*.49+np.sin((y+warp)*.94)*.09
wide=smooth_noise(N,N,32,4)*.11
texture= bands + wide + smooth_noise(N,N,1.25,5)*.045
color=np.stack([160+32*texture,115+29*texture,77+23*texture],axis=-1)
for cx,cy in [(145,210),(510,590)]:
    u=(x-cx)/43;v=(y-cy)/19
    knot=np.exp(-((u*u+v*v)*1.7))
    color-=knot[...,None]*np.array([28,25,19])
save_rgb('warm_oak.jpg',color)

# Darker walnut of cabinetry and painted oak.
save_rgb('walnut.jpg',color*np.array([.53,.52,.54])[None,None,:]+np.array([11,11,10]))

# Hand finished lime plaster with fine irregularities.
n=smooth_noise(N,N,5,7)*.8+smooth_noise(N,N,1,8)*.3+smooth_noise(N,N,45,9)*.4
plaster=np.stack([218+n*5,204+n*5,184+n*4],axis=-1)
save_rgb('lime_plaster.jpg',plaster)

# Ivory limestone tile, subtle gray veins & thick grout lines, baked in texture.
n=smooth_noise(N,N,10,11)*1.7+smooth_noise(N,N,1.8,12)*.6
stone=np.stack([193+n*4,181+n*4,164+n*5],axis=-1)
vein=np.sin(x*.032+smooth_noise(N,N,27,14)*2+y*.012)>0.988
stone[vein]=stone[vein]*.84
for u in range(0,N,192):
    stone[max(u-2,0):min(u+3,N),:,:]=[120,113,105]
    stone[:,max(u-2,0):min(u+3,N),:]=[120,113,105]
save_rgb('limestone_tiles.jpg',stone)

# Off-white limestone marble counter with muted brown flowing veins.
phase=(x*0.023+y*0.003+smooth_noise(N,N,24,17)*1.8)
line=np.sin(phase)
marble=np.stack([222+smooth_noise(N,N,4,15)*4,216+smooth_noise(N,N,4,15)*4,201+smooth_noise(N,N,4,15)*4],axis=-1)
linew=np.clip((line-.87)*7,0,1)
marble-=linew[...,None]*np.array([57,51,42])
save_rgb('marble_counter.jpg',marble)

# Textile bench cushions, woven threads with color variation.
fabric=(np.cos(x*np.pi/3.2)*1.5+np.sin(y*np.pi/3.8)*1.2)+smooth_noise(N,N,3,19)*1.8
save_rgb('woven_linen.jpg',np.stack([164+fabric,145+fabric,126+fabric],axis=-1))

# A soft, intentionally defocused view through the west window (environment dressing).
w,h=1280,720
im=Image.new('RGB',(w,h));p=np.asarray(im).copy()
yy=np.linspace(0,1,h)[:,None];xx=np.linspace(0,1,w)[None,:]
for c,(a,b) in enumerate([(168,229),(191,221),(205,210)]):
    p[:,:,c]=np.clip(a+(b-a)*yy+8*np.sin(xx*7+yy*2),0,255)
im=Image.fromarray(p,'RGB');dr=ImageDraw.Draw(im)
for k,(bx,bw,bh) in enumerate([(15,170,360),(158,130,295),(314,180,430),(485,170,270),(670,112,350),(785,245,410),(1041,200,315)]):
    top=h-bh
    dr.rectangle((bx,top,bx+bw,h),fill=(139+k%3*9,152+k%2*8,151+k%3*7))
    for wx in range(bx+15,min(bx+bw,w-12),31):
        for wy in range(top+21,h-15,39):
            if (wx//31+wy//39)%3!=0:dr.rectangle((wx,wy,wx+11,wy+16),fill=(191,187,164))
im=im.filter(ImageFilter.GaussianBlur(9))
# greenery silhouettes closest to glazing
D=ImageDraw.Draw(im,'RGBA')
for i in range(25):
    sx=int(25+i*53+12*np.sin(i*3));height=int(100+45*np.sin(i*1.3))
    D.ellipse((sx-62,h-height,sx+83,h+48),fill=(62,89,72,60))
im=im.filter(ImageFilter.GaussianBlur(4))
im.save(OUT/'window_city.jpg',quality=90)

# Café sign texture, so actual letters replace the old rows of random dots.
font_paths=['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','/Library/Fonts/Arial.ttf']
font_path=next((p for p in font_paths if Path(p).exists()),None)
font=lambda sz:ImageFont.truetype(font_path,sz) if font_path else ImageFont.load_default()
sign=Image.new('RGB',(1024,256),(44,37,32));d=ImageDraw.Draw(sign)
d.rectangle((12,12,1012,244),outline=(180,134,83),width=5)
d.text((60,48),'CAFÉ  LUMIÈRE',font=font(73),fill=(239,217,178))
d.text((63,151),'COFFEE    •    PASTRIES    •    SLOW MORNINGS',font=font(26),fill=(205,164,121))
sign.save(OUT/'cafe_sign.png',optimize=True)

menu=Image.new('RGB',(768,960),(30,41,39));d=ImageDraw.Draw(menu)
d.rectangle((14,14,754,946),outline=(183,142,98),width=5)
d.text((93,70),'THE MORNING MENU',font=font(44),fill=(236,217,189))
for i,(name,price) in enumerate([('ESPRESSO','4.00'),('FLAT WHITE','5.50'),('CAPPUCCINO','5.25'),('OAT LATTE','5.75'),('CROISSANT','4.50'),('CINNAMON ROLL','5.00')]):
    py=178+i*106
    d.text((88,py),name,font=font(35),fill=(222,217,199))
    d.text((580,py),price,font=font(33),fill=(224,185,132))
    d.line((87,py+61,681,py+61),fill=(81,93,86),width=2)
menu.save(OUT/'menu_board.png',optimize=True)
print('Generated deterministic café texture pack')
