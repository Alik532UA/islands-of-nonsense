# JASS умений рас: баффы на время, замедление, чума, мина, заражение, закрытие умений до 5-й минуты.
# Подключается в build_cf.py: GLOBALS в блок globals, jass(rows) перед CF_OnSpell.

GLOBALS = '''timer array CF_TM
group array CF_TG
integer array CF_TA
integer array CF_TK
group array CF_IG
integer array CF_IN
unit array CF_IC
real array CF_IDM
timer array CF_IT
'''


def jass(rows, tiers):
    q = chr(39)
    # ступень бонуса урона по типу юнита: около 34% от dps (примерно +25% урона за удар)
    chain = []
    for r in rows:
        if not r['dps']:
            continue
        want = 0.34 * r['dps']
        k = min(range(len(tiers)), key=lambda i: abs(tiers[i] - want))
        chain.append((r['u'], k + 1))
    seen = set()
    lines = []
    for u, k in chain:
        if u in seen:
            continue
        seen.add(u)
        lines.append("%sif t==%s%s%s then\nreturn %sCbd%d%s" % ('else' if lines else '', q, u, q, q, k, q))
    dmg_abil = ('function CF_DmgAbil takes integer t returns integer\n' + '\n'.join(lines) +
                ('\nendif\n' if lines else '\n') + "return 'Cbd3'\nendfunction\n")
    return '''// ---------- умения рас: баффы, замедление, чума, мина, заражение ----------
function CF_Gate takes integer p,unit c returns boolean
if CF_T<300. then
call DisplayTimedTextToPlayer(Player(p),0,0,5.,"|cffFF0000Умения рас открываются на 5-й минуте. Осталось "+I2S(R2I(300.-CF_T))+" с.|r")
call UnitResetCooldown(c)
return false
endif
return true
endfunction
function CF_TimedClean takes group g,integer abil,integer k returns nothing
local unit u
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if k==0 then
call UnitRemoveAbility(u,abil)
elseif k==1 then
call SetUnitMoveSpeed(u,GetUnitDefaultMoveSpeed(u))
elseif k==3 then
call SetUnitInvulnerable(u,false)
else
call UnitRemoveAbility(u,'Cbd1')
call UnitRemoveAbility(u,'Cbd2')
call UnitRemoveAbility(u,'Cbd3')
call UnitRemoveAbility(u,'Cbd4')
call UnitRemoveAbility(u,'Cbd5')
call UnitRemoveAbility(u,'Cbd6')
endif
endloop
call DestroyGroup(g)
endfunction
function CF_TimedEnd takes nothing returns nothing
local timer t=GetExpiredTimer()
local integer i=0
loop
exitwhen i>15
if CF_TM[i]==t then
call CF_TimedClean(CF_TG[i],CF_TA[i],CF_TK[i])
set CF_TG[i]=null
set CF_TM[i]=null
call DestroyTimer(t)
endif
set i=i+1
endloop
set t=null
endfunction
// k: 0 снять способность abil, 1 вернуть скорость движения, 2 снять способности урона, 3 снять неуязвимость
function CF_Timed takes group g,integer abil,integer k,real sec returns nothing
local integer i=0
loop
exitwhen i>15
if CF_TG[i]==null then
set CF_TG[i]=g
set CF_TA[i]=abil
set CF_TK[i]=k
set CF_TM[i]=CreateTimer()
call TimerStart(CF_TM[i],sec,false,function CF_TimedEnd)
return
endif
set i=i+1
endloop
call CF_TimedClean(g,abil,k)
endfunction
function CF_Buff takes integer p,integer abil,real sec returns nothing
local group g=CreateGroup()
local group r=CreateGroup()
local unit u
call GroupEnumUnitsOfPlayer(g,Player(p),null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if GetWidgetLife(u)>.405 and not IsUnitType(u,UNIT_TYPE_STRUCTURE)and GetUnitAbilityLevel(u,abil)==0 then
call UnitAddAbility(u,abil)
call GroupAddUnit(r,u)
endif
endloop
call DestroyGroup(g)
set g=null
call CF_Timed(r,abil,0,sec)
set r=null
endfunction
''' + dmg_abil + '''function CF_BuffDmg takes integer p,real sec returns nothing
local group g=CreateGroup()
local group r=CreateGroup()
local unit u
local integer cf_a
call GroupEnumUnitsOfPlayer(g,Player(p),null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if GetWidgetLife(u)>.405 and not IsUnitType(u,UNIT_TYPE_STRUCTURE)then
set cf_a=CF_DmgAbil(GetUnitTypeId(u))
if GetUnitAbilityLevel(u,cf_a)==0 then
call UnitAddAbility(u,cf_a)
call GroupAddUnit(r,u)
endif
endif
endloop
call DestroyGroup(g)
set g=null
call CF_Timed(r,0,2,sec)
set r=null
endfunction
function CF_Slow takes integer p,real sec returns nothing
local group g=CreateGroup()
local group r=CreateGroup()
local unit u
call GroupEnumUnitsInRange(g,0.,0.,9000.,null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if GetWidgetLife(u)>.405 and IsUnitEnemy(u,Player(p))and not IsUnitType(u,UNIT_TYPE_STRUCTURE)and GetOwningPlayer(u)!=Player(PLAYER_NEUTRAL_AGGRESSIVE)then
call SetUnitMoveSpeed(u,GetUnitDefaultMoveSpeed(u)*.5)
call GroupAddUnit(r,u)
endif
endloop
call DestroyGroup(g)
set g=null
call CF_Timed(r,0,1,sec)
set r=null
endfunction
// Предмет «Свиток Слабости»: враги-бойцы вокруг строителя c: атака -40% (способность Ci03), бег -25%, на sec секунд
function CF_Weaken takes integer p,unit c,real rad,real sec returns nothing
local group cf_g=CreateGroup()
local group cf_r=CreateGroup()
local group cf_s=CreateGroup()
local unit cf_u
call GroupEnumUnitsInRange(cf_g,GetUnitX(c),GetUnitY(c),rad,null)
loop
set cf_u=FirstOfGroup(cf_g)
exitwhen cf_u==null
call GroupRemoveUnit(cf_g,cf_u)
if GetWidgetLife(cf_u)>.405 and IsUnitEnemy(cf_u,Player(p))and not IsUnitType(cf_u,UNIT_TYPE_STRUCTURE)and GetOwningPlayer(cf_u)!=Player(PLAYER_NEUTRAL_AGGRESSIVE)and GetUnitAbilityLevel(cf_u,'Ci03')==0 then
call UnitAddAbility(cf_u,'Ci03')
call GroupAddUnit(cf_r,cf_u)
call SetUnitMoveSpeed(cf_u,GetUnitDefaultMoveSpeed(cf_u)*.75)
call GroupAddUnit(cf_s,cf_u)
endif
endloop
call DestroyGroup(cf_g)
set cf_g=null
call CF_Timed(cf_r,'Ci03',0,sec)
call CF_Timed(cf_s,0,1,sec)
set cf_r=null
set cf_s=null
endfunction
// Предмет «Лазурный купол»: здания команды вокруг строителя c неуязвимы sec секунд
function CF_Dome takes integer p,unit c,real rad,real sec returns nothing
local group cf_g=CreateGroup()
local group cf_r=CreateGroup()
local unit cf_u
call GroupEnumUnitsInRange(cf_g,GetUnitX(c),GetUnitY(c),rad,null)
loop
set cf_u=FirstOfGroup(cf_g)
exitwhen cf_u==null
call GroupRemoveUnit(cf_g,cf_u)
if GetWidgetLife(cf_u)>.405 and IsUnitAlly(cf_u,Player(p))and IsUnitType(cf_u,UNIT_TYPE_STRUCTURE)and GetUnitAbilityLevel(cf_u,'Avul')==0 then
call SetUnitInvulnerable(cf_u,true)
call GroupAddUnit(cf_r,cf_u)
call DestroyEffect(AddSpecialEffect("Abilities\\\\Spells\\\\Human\\\\DivineShield\\\\DivineShieldTarget.mdl",GetUnitX(cf_u),GetUnitY(cf_u)))
endif
endloop
call DestroyGroup(cf_g)
set cf_g=null
call CF_Timed(cf_r,0,3,sec)
set cf_r=null
endfunction
function CF_Plague takes unit c,real k returns nothing
local group g=CreateGroup()
local unit u
call GroupEnumUnitsInRange(g,0.,0.,9000.,null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if GetWidgetLife(u)>.405 and IsUnitEnemy(u,GetOwningPlayer(c))and not IsUnitType(u,UNIT_TYPE_STRUCTURE)and GetOwningPlayer(u)!=Player(PLAYER_NEUTRAL_AGGRESSIVE)then
call UnitDamageTarget(c,u,GetUnitState(u,UNIT_STATE_MAX_LIFE)*k,false,false,ATTACK_TYPE_CHAOS,DAMAGE_TYPE_UNIVERSAL,WEAPON_TYPE_WHOKNOWS)
endif
endloop
call DestroyGroup(g)
set g=null
endfunction
function CF_Mine takes unit c,real r,real dmg returns nothing
call CF_Nuke(c,0.,0.,r,dmg)
endfunction
function CF_InfectTick takes nothing returns nothing
local timer t=GetExpiredTimer()
local integer i=0
local group tmp
local group near
local unit u
local unit v
loop
exitwhen i>7
if CF_IT[i]==t then
set CF_IN[i]=CF_IN[i]-1
if CF_IN[i]<=0 then
call DestroyGroup(CF_IG[i])
set CF_IG[i]=null
set CF_IT[i]=null
call DestroyTimer(t)
else
set tmp=CreateGroup()
call GroupAddGroup(CF_IG[i],tmp)
loop
set u=FirstOfGroup(tmp)
exitwhen u==null
call GroupRemoveUnit(tmp,u)
if GetWidgetLife(u)<=.405 then
call GroupRemoveUnit(CF_IG[i],u)
else
call UnitDamageTarget(CF_IC[i],u,CF_IDM[i],false,false,ATTACK_TYPE_CHAOS,DAMAGE_TYPE_UNIVERSAL,WEAPON_TYPE_WHOKNOWS)
set near=CreateGroup()
call GroupEnumUnitsInRange(near,GetUnitX(u),GetUnitY(u),150.,null)
loop
set v=FirstOfGroup(near)
exitwhen v==null
call GroupRemoveUnit(near,v)
if GetWidgetLife(v)>.405 and IsUnitEnemy(v,GetOwningPlayer(CF_IC[i]))and not IsUnitType(v,UNIT_TYPE_STRUCTURE)and GetOwningPlayer(v)!=Player(PLAYER_NEUTRAL_AGGRESSIVE)and not IsUnitInGroup(v,CF_IG[i])then
call GroupAddUnit(CF_IG[i],v)
endif
endloop
call DestroyGroup(near)
endif
endloop
call DestroyGroup(tmp)
endif
endif
set i=i+1
endloop
set t=null
set tmp=null
set near=null
endfunction
function CF_Infect takes unit c,real x,real y,real r,real dmg returns nothing
local group g=CreateGroup()
local group h=CreateGroup()
local unit u
local integer i=0
call DestroyEffect(AddSpecialEffect("Abilities\\\\Spells\\\\Human\\\\Thunderclap\\\\ThunderClapCaster.mdl",x,y))
call GroupEnumUnitsInRange(g,x,y,r,null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if GetWidgetLife(u)>.405 and IsUnitEnemy(u,GetOwningPlayer(c))and not IsUnitType(u,UNIT_TYPE_STRUCTURE)and GetOwningPlayer(u)!=Player(PLAYER_NEUTRAL_AGGRESSIVE)then
call GroupAddUnit(h,u)
endif
endloop
call DestroyGroup(g)
set g=null
loop
exitwhen i>7
if CF_IG[i]==null then
set CF_IG[i]=h
set CF_IN[i]=8
set CF_IC[i]=c
set CF_IDM[i]=dmg
set CF_IT[i]=CreateTimer()
call TimerStart(CF_IT[i],1.,true,function CF_InfectTick)
set h=null
return
endif
set i=i+1
endloop
call DestroyGroup(h)
set h=null
endfunction
'''
