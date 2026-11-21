# Окупаемость уровня кузницы: ценность = прибавка_силы * средний V (армия) от покупки до конца раунда.
# Здание за X золота даёт X производства на тот же срок, поэтому уровень выгоден, если цена < ценность.
exec(open('_econ.py', encoding='utf-8').read().split('t, gold, V')[0])
def series(T):
    t, gold, V, out = 0., 250., 0., []
    while t <= T:
        f, m = phase(t)
        inc = round(dimin(10 * (.5 + .002 * V)) * m)
        V += gold + inc; gold = 0; t += 10 * f; out.append((t, V))
    return out
S = series(1200)
def avgV(a, b):
    xs = [v for t, v in S if a <= t <= b]
    return sum(xs) / len(xs)
END = 900  # раунд 15 мин
print('Средняя армия до конца 15-мин раунда, если купить на минуте:')
for mn in (2, 5, 8, 11):
    v = avgV(mn * 60, END)
    print(f'  {mn:>2} мин: avgV={v:6.0f}  атака +8% стоит {0.08*v:4.0f}, броня +1 (~6%) {0.06*v:4.0f}')
