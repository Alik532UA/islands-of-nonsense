# Модель экономики CF mod (по orig_war3map.j + патч build_cf.py):
# доход за тик = убывающая_отдача(10*(0.5+0.002*V)) * CF_M, тик = 10*f с; V = стоимость построенных зданий
def dimin(i, pr=25.):
    j, k = 0., 0
    while i >= pr and k < 6:
        i -= pr; j += pr * (1 - k * .15); k += 1
    return j + i * (1 - k * .15)

def phase(t):
    f = .3 if t < 480 else .5 if t < 960 else .7 if t < 1500 else 1.
    return f, .5 + .5 * f

t, gold, V = 0., 250., 0.
marks = {300: None, 600: None, 900: None, 1200: None, 1800: None}
while t <= 1800:
    f, m = phase(t)
    inc = round(dimin(10 * (.5 + .002 * V)) * m)
    gold += inc
    V += gold; gold = 0          # всё сразу в здания
    t += 10 * f
    for k in marks:
        if marks[k] is None and t >= k:
            marks[k] = (round(V), round(inc / (10 * f) * 60))
for k, (v, ipm) in marks.items():
    print(f'{k//60:>2} мин: здания V={v:>6} золота, доход {ipm:>5} зол/мин')
