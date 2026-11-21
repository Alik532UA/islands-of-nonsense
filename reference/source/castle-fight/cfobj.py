# Чтение и запись объектов карты (w3u/w3a) без потерь + базовые статы из SLK
import struct, re, os

HERE = os.path.dirname(os.path.abspath(__file__))


class Obj:
    def __init__(self, base, new, mods):
        self.base, self.new, self.mods = base, new, mods  # mods: list [fid, typ, lvl, dat, val]

    @property
    def id(self):
        return self.new if self.new != '\0\0\0\0' else self.base

    def get(self, fid, lvl=0, default=None):
        for m in self.mods:
            if m[0] == fid and m[2] == lvl:
                return m[4]
        return default

    def set(self, fid, val, typ=None, lvl=0, dat=0):
        for m in self.mods:
            if m[0] == fid and m[2] == lvl:
                m[4] = val
                return
        if typ is None:
            typ = 3 if isinstance(val, str) else (0 if isinstance(val, int) else 1)
        self.mods.append([fid, typ, lvl, dat, val])


def parse(data, levels):
    ver, = struct.unpack_from('<i', data, 0)
    p = 4
    tables = []
    for _ in range(2):
        n, = struct.unpack_from('<i', data, p); p += 4
        objs = []
        for _ in range(n):
            base, new = data[p:p + 4].decode('latin1'), data[p + 4:p + 8].decode('latin1'); p += 8
            k, = struct.unpack_from('<i', data, p); p += 4
            mods = []
            for _ in range(k):
                fid = data[p:p + 4].decode('latin1'); p += 4
                t, = struct.unpack_from('<i', data, p); p += 4
                lvl = dat = 0
                if levels:
                    lvl, dat = struct.unpack_from('<ii', data, p); p += 8
                if t == 0:
                    v, = struct.unpack_from('<i', data, p); p += 4
                elif t in (1, 2):
                    v, = struct.unpack_from('<f', data, p); p += 4
                else:
                    e = data.index(b'\0', p); v = data[p:e].decode('utf-8'); p = e + 1
                end = data[p:p + 4]; p += 4  # конец поля
                mods.append([fid, t, lvl, dat, v, end])
            objs.append(Obj(base, new, mods))
        tables.append(objs)
    assert p == len(data), 'хвост'
    return ver, tables


def dump(ver, tables, levels):
    out = [struct.pack('<i', ver)]
    for objs in tables:
        out.append(struct.pack('<i', len(objs)))
        for o in objs:
            out.append(o.base.encode('latin1') + o.new.encode('latin1') + struct.pack('<i', len(o.mods)))
            for m in o.mods:
                fid, t, lvl, dat, v = m[:5]
                out.append(fid.encode('latin1') + struct.pack('<i', t))
                if levels:
                    out.append(struct.pack('<ii', lvl, dat))
                if t == 0:
                    out.append(struct.pack('<i', v))
                elif t in (1, 2):
                    out.append(struct.pack('<f', v))
                else:
                    out.append(v.encode('utf-8') + b'\0')
                out.append(m[5] if len(m) > 5 else o.id.encode('latin1'))
    return b''.join(out)


def slk(path):
    rows, cols, cur = {}, {}, None
    grid = {}
    for line in open(path, encoding='latin1').read().splitlines():
        if not line.startswith('C;'):
            continue
        x = y = None
        val = None
        for part in line.split(';')[1:]:
            if part[:1] == 'X':
                x = int(part[1:])
            elif part[:1] == 'Y':
                y = int(part[1:])
            elif part[:1] == 'K':
                val = part[1:].strip('"')
        if y is None:
            y = cur
        cur = y
        grid[(x, y)] = val
    for (x, y), v in grid.items():
        if y == 1:
            cols[x] = v
    for (x, y), v in grid.items():
        if y > 1 and x != 1 and (1, y) in grid:
            rows.setdefault(grid[(1, y)], {})[cols.get(x)] = v
    return rows


SLK_MAP = {'uhpm': ('B', 'HP'), 'udef': ('B', 'def'), 'ugol': ('B', 'goldcost'), 'ua1b': ('W', 'dmgplus1'),
           'ua1d': ('W', 'dice1'), 'ua1s': ('W', 'sides1'), 'ua1c': ('W', 'cool1'), 'ua1r': ('W', 'rangeN1'),
           'umvt': ('D', 'movetp'), 'ua1g': ('W', 'targs1'), 'uaen': ('W', 'weapsOn'), 'ua1t': ('W', 'atkType1'),
           'udty': ('B', 'defType')}
_S = {}


def base_stats():
    if not _S:
        _S['B'] = slk(os.path.join(HERE, 'slk', 'UnitBalance.slk'))
        _S['W'] = slk(os.path.join(HERE, 'slk', 'UnitWeapons.slk'))
        _S['D'] = slk(os.path.join(HERE, 'slk', 'UnitData.slk'))
    return _S


def stat(units, uid, fid):
    o = units.get(uid)
    if o is not None and o.get(fid) is not None:
        return o.get(fid)
    base = o.base if o is not None else uid
    t, col = SLK_MAP[fid]
    v = base_stats()[t].get(base, {}).get(col)
    if v in (None, '-', '_'):
        return None
    try:
        return float(v) if '.' in v else int(v)
    except ValueError:
        return v
