# Механика расы «Сборщики» (этап 4, упрощённая по plan_v2): «Обломки v1» и умение «Великая сборка».
# Смерть бойца Сборщиков (cg11..cg1b): два ближайших живых союзных бойца в радиусе 400 получают +10% скорости атаки на 15 с (способность Cgb1).
# Пока у игрока действует «Великая сборка» (CF_AsmE[p] > CF_T): четыре ближайших и +20% (Cgb2).
# Никаких юнитов-пустышек: кольцо на 64 записи (юнит, способность, время конца) и один таймер 1 с. Один триггер смерти на всех игроков, фильтр по типу в первой строке.
# Пары (ауры) из спеки в версию 1 не вошли: осознанное упрощение (shortcut: усилить аурами, если сила расы на этапе 5 окажется ниже нормы).
import race_sbor as RS
EFF = 'Abilities' + chr(92) * 2 + 'Spells' + chr(92) * 2 + 'Orc' + chr(92) * 2 + 'Bloodlust' + chr(92) * 2 + 'BloodlustTarget.mdl'
RING = 64
SEC_NORMAL, SEC_GREAT = 15., 15.
N_NORMAL, N_GREAT = 2, 4
BONUS_NORMAL, BONUS_GREAT = 0.10, 0.20

GLOBALS = '''unit array CF_DbU
real array CF_DbE
integer array CF_DbA
real array CF_AsmE
integer array CF_SpN
integer CF_SpT=0
'''

FUNCS = '''// ---------- Раса Сборщики: обломки и Великая сборка ----------
function CF_DbAdd takes unit u,integer abil,real sec returns nothing
local integer i=0
local integer f=-1
loop
exitwhen i>%(r)d
if CF_DbU[i]==u and CF_DbA[i]==abil then
set CF_DbE[i]=CF_T+sec
return
endif
if f<0 and CF_DbU[i]==null then
set f=i
endif
set i=i+1
endloop
if f<0 then
return
endif
set CF_DbU[f]=u
set CF_DbA[f]=abil
set CF_DbE[f]=CF_T+sec
call UnitAddAbility(u,abil)
call DestroyEffect(AddSpecialEffectTarget("%(e)s",u,"overhead"))
endfunction
function CF_DbTick takes nothing returns nothing
local integer i=0
local unit cf_c
local integer cf_n
loop
exitwhen i>%(r)d
if CF_DbU[i]!=null then
if CF_DbE[i]<=CF_T or GetWidgetLife(CF_DbU[i])<=.405 then
call UnitRemoveAbility(CF_DbU[i],CF_DbA[i])
set CF_DbU[i]=null
endif
endif
set i=i+1
endloop
// Ремонтный пункт: раз в %(rs)d с чинит замок команды
set CF_SpT=CF_SpT+1
if CF_SpT>=%(rs)d then
set CF_SpT=0
set i=0
loop
exitwhen i>11
set cf_n=CF_SpN[i*3+2]
if cf_n>%(cap)d then
set cf_n=%(cap)d
endif
if cf_n>0 then
set cf_c=Rr[Fi[i+1]]
if cf_c==null then
if Fi[i+1]==0 then
set cf_c=fE
else
set cf_c=FE
endif
endif
if cf_c!=null and GetWidgetLife(cf_c)>.405 then
call SetWidgetLife(cf_c,GetWidgetLife(cf_c)+GetUnitState(cf_c,UNIT_STATE_MAX_LIFE)*%(rp)s*I2R(cf_n))
endif
endif
set i=i+1
endloop
endif
set cf_c=null
endfunction
function CF_DbDeath takes nothing returns nothing
local unit d=GetTriggerUnit()
local integer id=GetUnitTypeId(d)
local integer p
local integer cf_n=0
local integer want=%(n1)d
local integer abil='Cgb1'
local group g
local group t
local unit u
local unit b
local real best
local real dd
local integer cf_k
local real cf_s=%(s)s
if id>='cg0b' and id<='cg0d' then
set p=GetPlayerId(GetOwningPlayer(d))
if p<=11 and CF_SpN[p*3+id-'cg0b']>0 then
set CF_SpN[p*3+id-'cg0b']=CF_SpN[p*3+id-'cg0b']-1
endif
set d=null
return
endif
if id<'cg11' or id>'cg1b' then
set d=null
return
endif
set p=GetPlayerId(GetOwningPlayer(d))
if p>11 then
set d=null
return
endif
if CF_AsmE[p]>CF_T then
set want=%(n2)d
set abil='Cgb2'
endif
set cf_k=CF_SpN[p*3]
if cf_k>%(cap)d then
set cf_k=%(cap)d
endif
if cf_k>0 then
call AdjustPlayerStateBJ(%(sg)d*cf_k,Player(p),PLAYER_STATE_RESOURCE_GOLD)
//SPLOG_GOLD
endif
if CF_SpN[p*3+1]>0 then
set want=want+%(dn)d
set cf_s=cf_s+%(ds)s
endif
set g=CreateGroup()
call GroupEnumUnitsInRange(g,GetUnitX(d),GetUnitY(d),400.,null)
loop
exitwhen cf_n>=want
set b=null
set best=999999.
set t=CreateGroup()
call GroupAddGroup(g,t)
loop
set u=FirstOfGroup(t)
exitwhen u==null
call GroupRemoveUnit(t,u)
if u!=d and GetWidgetLife(u)>.405 and not IsUnitType(u,UNIT_TYPE_STRUCTURE) and IsUnitAlly(u,GetOwningPlayer(d)) and GetUnitAbilityLevel(u,'Cf01')==0 and GetPlayerId(GetOwningPlayer(u))<12 then
set dd=(GetUnitX(u)-GetUnitX(d))*(GetUnitX(u)-GetUnitX(d))+(GetUnitY(u)-GetUnitY(d))*(GetUnitY(u)-GetUnitY(d))
if dd<best then
set best=dd
set b=u
endif
endif
endloop
call DestroyGroup(t)
if b==null then
set cf_n=want
else
call GroupRemoveUnit(g,b)
call CF_DbAdd(b,abil,cf_s)
set cf_n=cf_n+1
endif
endloop
call DestroyGroup(g)
set g=null
set t=null
set u=null
set b=null
set d=null
endfunction
function CF_SpAddU takes unit u returns nothing
local integer id=GetUnitTypeId(u)
local integer p=GetPlayerId(GetOwningPlayer(u))
if id>='cg0b' and id<='cg0d' and p<=11 then
set CF_SpN[p*3+id-'cg0b']=CF_SpN[p*3+id-'cg0b']+1
endif
endfunction
function CF_SpBuilt takes nothing returns nothing
call CF_SpAddU(GetConstructedStructure())
endfunction
function CF_SpReset takes nothing returns nothing
local integer cf_i=0
loop
exitwhen cf_i>35
set CF_SpN[cf_i]=0
set cf_i=cf_i+1
endloop
set CF_SpT=0
endfunction
function CF_Assemble takes integer p,real sec returns nothing
set CF_AsmE[p]=CF_T+sec
endfunction
''' % {'r': RING - 1, 'e': EFF, 'n1': N_NORMAL, 'n2': N_GREAT, 's': '%.1f' % SEC_NORMAL, 'cap': RS.SP_CAP, 'sg': RS.SP_GOLD, 'dn': RS.SP_DB_N,
   'ds': '%.1f' % RS.SP_DB_SEC, 'rs': RS.SP_REP_SEC, 'rp': '%.2f' % (RS.SP_REP_PCT / 100.)}

INIT = '''set t=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(t,EVENT_PLAYER_UNIT_DEATH)
call TriggerAddAction(t,function CF_DbDeath)
set t=CreateTrigger()
call TriggerRegisterTimerEventPeriodic(t,1.)
call TriggerAddAction(t,function CF_DbTick)
set t=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(t,EVENT_PLAYER_UNIT_CONSTRUCT_FINISH)
call TriggerAddAction(t,function CF_SpBuilt)
'''

# вспомогательные функции автотеста (подключаются в ветке test* в build_cf.py)
TEST_FUNCS = '''function CF_DbCnt takes integer p,integer cf_a returns integer
local group g=CreateGroup()
local unit u
local integer cf_n=0
call GroupEnumUnitsOfPlayer(g,Player(p),null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if GetUnitAbilityLevel(u,cf_a)>0 and GetWidgetLife(u)>.405 then
set cf_n=cf_n+1
endif
endloop
call DestroyGroup(g)
set g=null
return cf_n
endfunction
function CF_DbKill takes integer p,real cf_x,real cf_y returns nothing
local group g=CreateGroup()
local unit u
local integer id
call GroupEnumUnitsOfPlayer(g,Player(p),null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
set id=GetUnitTypeId(u)
if id>='cg11' and id<='cg1b' and GetWidgetLife(u)>.405 and RAbsBJ(GetUnitX(u)-cf_x)<300. and RAbsBJ(GetUnitY(u)-cf_y)<300. then
call KillUnit(u)
call DestroyGroup(g)
set g=null
return
endif
endloop
call DestroyGroup(g)
set g=null
endfunction
function CF_DbSpawn takes integer p,real cf_x,real cf_y returns nothing
local integer i=0
loop
exitwhen i>5
call CreateUnit(Player(p),'cg11',cf_x+60.*I2R(i),cf_y,0.)
set i=i+1
endloop
endfunction
function CF_VTrial takes integer cf_c returns nothing
set CF_Cmd[6]=cf_c
set CF_TU=CreateUnit(Player(6),'cg11',-2000.,-1500.,0.)
set CF_TU2=CreateUnit(Player(12),'cg12',-1930.,-1500.,180.)
call SetUnitState(CF_TU2,UNIT_STATE_MAX_LIFE,90000.)
call SetWidgetLife(CF_TU2,90000.)
call PauseUnit(CF_TU2,true)
if cf_c==4 then
if GetUnitAbilityLevel(CF_TU,'Cc01')>0 then
call SaveInteger(CF_HD,8,0,1)
else
call SaveInteger(CF_HD,8,0,2)
endif
endif
if LoadInteger(CF_HD,8,0)==2 then
call CF_Up(CF_TU)
endif
call IssueTargetOrder(CF_TU,"attack",CF_TU2)
call CF_Log("V start life="+R2S(GetWidgetLife(CF_TU2))+" owner_enemy="+I2S(IntegerTertiaryOp(IsUnitEnemy(CF_TU2,Player(6)),1,0)))
endfunction
function CF_VEnd takes integer cf_c returns nothing
call CF_Log("V cmd="+I2S(cf_c)+" lost="+I2S(90000-R2I(GetWidgetLife(CF_TU2)))+" cc01="+I2S(GetUnitAbilityLevel(CF_TU,'Cc01'))+" auto="+I2S(LoadInteger(CF_HD,8,0)))
call RemoveUnit(CF_TU)
call RemoveUnit(CF_TU2)
endfunction
function CF_SpMake takes integer p,integer id returns nothing
call CF_SpAddU(CreateUnit(Player(p),id,-2600.,-1700.,0.))
endfunction
function CF_SpCnt takes integer p returns string
return I2S(CF_SpN[p*3])+"/"+I2S(CF_SpN[p*3+1])+"/"+I2S(CF_SpN[p*3+2])
endfunction
function CF_RepHurt takes integer p returns nothing
local unit cf_c
set cf_c=Rr[Fi[p+1]]
call SetWidgetLife(cf_c,GetUnitState(cf_c,UNIT_STATE_MAX_LIFE)*.5)
set cf_c=null
endfunction
function CF_RepPct takes integer p returns string
local unit cf_c
local string cf_r
set cf_c=Rr[Fi[p+1]]
set cf_r=R2S(GetUnitLifePercent(cf_c))
set cf_c=null
return cf_r
endfunction
function CF_SpBuild takes integer p,integer id returns nothing
local group g=CreateGroup()
local unit u
local boolean cf_ok=false
call GroupEnumUnitsOfPlayer(g,Player(p),null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if GetUnitTypeId(u)=='cg00' then
set cf_ok=IssueBuildOrderById(u,id,GetUnitX(u)+300.,GetUnitY(u))
call CF_Log("Y build order idx="+I2S(id-'cg0b')+" ok="+I2S(IntegerTertiaryOp(cf_ok,1,0))+" x="+R2S(GetUnitX(u))+" y="+R2S(GetUnitY(u))+" gold="+I2S(GetPlayerState(Player(p),PLAYER_STATE_RESOURCE_GOLD))+" lum="+I2S(GetPlayerState(Player(p),PLAYER_STATE_RESOURCE_LUMBER)))
exitwhen true
endif
endloop
call DestroyGroup(g)
set g=null
set u=null
endfunction
function CF_TyCnt takes integer p,integer cf_t returns integer
local group g=CreateGroup()
local unit u
local integer cf_n=0
call GroupEnumUnitsOfPlayer(g,Player(p),null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if GetUnitTypeId(u)==cf_t then
set cf_n=cf_n+1
endif
endloop
call DestroyGroup(g)
set g=null
return cf_n
endfunction
'''
