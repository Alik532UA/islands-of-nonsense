# Логика ботов (средний уровень) для новых механик: кузница по фазам игры и умение расы по ситуации.
# Боты - игроки-компьютеры (слот «Компьютер» в лобби или -east/-west/-fill). Старое строительство зданий
# остаётся родным ИИ карты, мы добавляем поверх него только кузницу и умения.


def jass(RACES, SKILL, summon_unit, CD):
    # действие умения расы rc для бота p (строитель b - источник урона)
    acts = []
    for rc, (bid, rn) in enumerate(RACES):
        nm, ico, tt, kind, par, tip = SKILL[rn]
        # умения открываются на 5-й минуте; бот жмёт их, когда у его замка есть враги
        near = 'CF_T>=300. and CF_BotNear(p,1800.)>=3'
        if kind == 'dmg':
            cond, act = near, f'call CF_BuffDmg(p,{par}.)'
        elif kind == 'as':
            cond, act = near, f"call CF_Buff(p,'Cbs1',{par}.)"
        elif kind == 'sbor':
            cond, act = near, f'call CF_Assemble(p,{par}.)'
        elif kind == 'evade':
            cond, act = near, f"call CF_Buff(p,'Cbe1',{par}.)"
        elif kind == 'shield':
            cond, act = near, f"call CF_Buff(p,'AId5',{par}.)"
        elif kind == 'slow':
            cond, act = near, f'call CF_Slow(p,{par}.)'
        elif kind == 'plague':
            cond, act = near, f'call CF_Plague(b,{par / 100:.2f})'
        elif kind == 'mine':
            cond, act = near, f'call CF_Mine(b,{par[0]}.,{par[1]}.)'
        elif kind == 'infect':
            cond, act = 'CF_T>=300. and CF_BotAim(p)', f'call CF_Infect(b,CF_BotX,CF_BotY,{par[1]}.,{par[0]}.)'
        else:
            cond = 'CF_T>=300. and CF_BotAim(p)'
            act = f'call CF_Nuke(b,CF_BotX,CF_BotY,{par[1]}.,{par[0]}.)'
        acts.append(f'elseif rc=={rc} then\nif {cond} then\n{act}\nset ok=true\ncall CF_Say(p,"{nm}")\nendif')
    race_detect = '\n'.join(
        f"if GetUnitAbilityLevel(u,'Cr{rc:02d}')>0 then\nset CF_BotR[p]={rc}\nendif" for rc in range(len(RACES)))
    return '''// ---------- Боты: кузница и умения рас ----------
function CF_IsBot takes integer p returns boolean
return se[p+1]
endfunction
// враги не-здания в радиусе r от своего замка
function CF_BotNear takes integer p,real r returns integer
local unit c=CF_Castle(Fi[p+1])
local group g=CreateGroup()
local unit u
local integer n=0
call GroupEnumUnitsInRange(g,GetUnitX(c),GetUnitY(c),r,null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if GetWidgetLife(u)>.405 and IsUnitEnemy(u,Player(p))and not IsUnitType(u,UNIT_TYPE_STRUCTURE)and GetOwningPlayer(u)!=Player(PLAYER_NEUTRAL_AGGRESSIVE)then
set n=n+1
endif
endloop
call DestroyGroup(g)
set g=null
set c=null
return n
endfunction
// своих раненых (меньше 60% здоровья) бойцов
function CF_BotHurt takes integer p returns integer
local group g=CreateGroup()
local unit u
local integer n=0
call GroupEnumUnitsOfPlayer(g,Player(p),null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if GetWidgetLife(u)>.405 and not IsUnitType(u,UNIT_TYPE_STRUCTURE)and GetWidgetLife(u)<GetUnitState(u,UNIT_STATE_MAX_LIFE)*.6 then
set n=n+1
endif
endloop
call DestroyGroup(g)
set g=null
return n
endfunction
function CF_BotCastle takes integer p returns real
local unit c=CF_Castle(Fi[p+1])
local real r=GetWidgetLife(c)/RMaxBJ(1.,GetUnitState(c,UNIT_STATE_MAX_LIFE))
set c=null
return r
endfunction
// цель для удара по области: враг, вокруг которого ещё минимум 3 врага (смотрим 12 ближайших к нашему замку)
function CF_BotAim takes integer p returns boolean
local unit c=CF_Castle(Fi[p+1])
local group g=CreateGroup()
local group h=CreateGroup()
local unit u
local unit e
local integer n
local integer k=0
local boolean ok=false
call GroupEnumUnitsInRange(g,GetUnitX(c),GetUnitY(c),3500.,null)
loop
set u=FirstOfGroup(g)
exitwhen u==null or ok or k>=12
call GroupRemoveUnit(g,u)
if GetWidgetLife(u)>.405 and IsUnitEnemy(u,Player(p))and not IsUnitType(u,UNIT_TYPE_STRUCTURE)then
set k=k+1
set n=0
call GroupEnumUnitsInRange(h,GetUnitX(u),GetUnitY(u),350.,null)
loop
set e=FirstOfGroup(h)
exitwhen e==null
call GroupRemoveUnit(h,e)
if GetWidgetLife(e)>.405 and IsUnitEnemy(e,Player(p))and not IsUnitType(e,UNIT_TYPE_STRUCTURE)then
set n=n+1
endif
endloop
if n>=4 then
set CF_BotX=GetUnitX(u)
set CF_BotY=GetUnitY(u)
set ok=true
endif
endif
endloop
call DestroyGroup(g)
call DestroyGroup(h)
set g=null
set h=null
set c=null
set u=null
set e=null
return ok
endfunction
// строитель бота: ищем свой юнит с кнопками кузницы, заодно узнаём расу
function CF_BotBuilder takes integer p returns unit
local group g
local unit u
if CF_BotB[p]!=null and GetWidgetLife(CF_BotB[p])>.405 then
return CF_BotB[p]
endif
set CF_BotB[p]=null
set g=CreateGroup()
call GroupEnumUnitsOfPlayer(g,Player(p),null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if GetUnitAbilityLevel(u,'Cf01')>0 and CF_BotB[p]==null then
set CF_BotB[p]=u
''' + race_detect + '''
endif
endloop
call DestroyGroup(g)
set g=null
return CF_BotB[p]
endfunction
// кузница (с v16 каждый раунд с нуля, CF_BT = время раунда). Бот с меньшим номером в команде - «кузнец»:
// качает атаку и броню до 5 (с 3-го уровня бонус идёт и союзникам). Остальные: 2 атаки, 1 броня, в основном строят.
// Экономика окупается только в начале раунда: берём до 5-й минуты.
function CF_BotSmith takes integer p returns boolean
local integer cf_q=0
loop
exitwhen cf_q>=p
if CF_IsBot(cf_q)and Fi[cf_q+1]==Fi[p+1]then
return false
endif
set cf_q=cf_q+1
endloop
return true
endfunction
function CF_BotForge takes integer p returns nothing
local integer g=GetPlayerState(Player(p),PLAYER_STATE_RESOURCE_GOLD)
local integer k=-1
local integer c
local integer cf_ma=2
local integer cf_md=1
local integer cf_me=1
if CF_BotSave[p] then
return
endif
if CF_BotSmith(p)then
set cf_ma=5
set cf_md=5
set cf_me=2
endif
if CF_BT<300. and CF_FE[p]<cf_me then
set k=2
elseif CF_BT>=60. and CF_FA[p]<cf_ma and(CF_FA[p]<=CF_FD[p]or CF_FD[p]>=cf_md)then
set k=0
elseif CF_BT>=60. and CF_FD[p]<cf_md then
set k=1
endif
if k<0 then
return
endif
if k==0 then
set c=200+100*CF_FA[p]
elseif k==1 then
set c=150+75*CF_FD[p]
else
set c=150+100*CF_FE[p]
endif
if g>=c+250 then
call CF_Forge(p,k)
call CF_BotLog("bot "+I2S(p)+" forge "+I2S(k))
endif
endfunction
// умение расы: только когда есть смысл (враги у замка, много раненых, замок побит, плотная толпа врагов)
function CF_BotSkill takes integer p,unit b returns nothing
local integer rc=CF_BotR[p]
local boolean ok=false
if CF_BT<CF_BotNext[p]or rc<0 then
return
endif
if false then
''' + '\n'.join(acts) + '''
endif
if ok then
set CF_BotNext[p]=CF_BT+''' + str(CD) + '''.+GetRandomReal(0.,20.)
call CF_BotLog("bot "+I2S(p)+" skill "+I2S(rc))
endif
endfunction
// ---------- защита замка: Спасительный удар, Сфера молний, ремонт ----------
// враг у замка с самым большим здоровьем (цель для Сферы) и центр самой плотной кучи (для удара)
function CF_BotThreat takes integer p,real r returns unit
local unit c=CF_Castle(Fi[p+1])
local group g=CreateGroup()
local group h=CreateGroup()
local unit u
local unit e
local unit best=null
local integer n
local integer cf_bn=-1
local integer cf_k=0
call GroupEnumUnitsInRange(g,GetUnitX(c),GetUnitY(c),r,null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if GetWidgetLife(u)>.405 and IsUnitEnemy(u,Player(p))and not IsUnitType(u,UNIT_TYPE_STRUCTURE)and GetOwningPlayer(u)!=Player(PLAYER_NEUTRAL_AGGRESSIVE)then
set n=0
// плотность считаем только для первых 12 врагов (иначе при толпе перебор растёт квадратом)
if cf_k<12 then
set cf_k=cf_k+1
call GroupEnumUnitsInRange(h,GetUnitX(u),GetUnitY(u),350.,null)
loop
set e=FirstOfGroup(h)
exitwhen e==null
call GroupRemoveUnit(h,e)
if GetWidgetLife(e)>.405 and IsUnitEnemy(e,Player(p))and not IsUnitType(e,UNIT_TYPE_STRUCTURE)then
set n=n+1
endif
endloop
endif
if n>cf_bn then
set cf_bn=n
set CF_BotX=GetUnitX(u)
set CF_BotY=GetUnitY(u)
endif
if best==null or GetWidgetLife(u)>GetWidgetLife(best)then
set best=u
endif
endif
endloop
call DestroyGroup(g)
call DestroyGroup(h)
set g=null
set h=null
set c=null
set u=null
set e=null
return best
endfunction
function CF_BotOrb takes unit b returns item
local integer i=0
loop
exitwhen i>5
if GetItemTypeId(UnitItemInSlot(b,i))=='I006' then
return UnitItemInSlot(b,i)
endif
set i=i+1
endloop
return null
endfunction
// побитое своё здание (меньше 90%), самое побитое
function CF_BotHurtBld takes integer p returns unit
local group g=CreateGroup()
local unit u
local unit best=null
local real r=.9
call GroupEnumUnitsOfPlayer(g,Player(p),null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if GetWidgetLife(u)>.405 and IsUnitType(u,UNIT_TYPE_STRUCTURE)and GetWidgetLife(u)/GetUnitState(u,UNIT_STATE_MAX_LIFE)<r then
set r=GetWidgetLife(u)/GetUnitState(u,UNIT_STATE_MAX_LIFE)
set best=u
endif
endloop
call DestroyGroup(g)
set g=null
return best
endfunction
function CF_BotDefend takes integer p,unit b returns nothing
local unit c=CF_Castle(Fi[p+1])
local integer near=CF_BotNear(p,1200.)
local real hp=CF_BotCastle(p)
local integer cf_o=GetUnitCurrentOrder(b)
local unit t
local item it
// 1. Спасительный удар (один раз за игру): толпа у замка, замок побит при натиске, или замок почти убит
// один удар на команду за раз: после удара союзника остальные ждут 6 с (удар успевает убить) и решают заново;
// при 15+ врагах у замка ждут только 2 с (на деле до следующего шага бота, 3 с)
if GetUnitAbilityLevel(b,'A005')>0 and cf_o!=852488 and(CF_BT>=CF_StrikeT[Fi[p+1]] or(near>=15 and CF_BT>=CF_StrikeT[Fi[p+1]]-4.))and(near>=10 or(near>=5 and hp<.5)or(near>=1 and hp<.2))then
set t=CF_BotThreat(p,1200.)
if t!=null then
set CF_StrikeT[Fi[p+1]]=CF_BT+6.
call IssuePointOrder(b,"flamestrike",CF_BotX,CF_BotY)
call CF_BotLog("bot "+I2S(p)+" rescue strike near="+I2S(near)+" castle="+R2S(hp))
set t=null
set c=null
return
endif
endif
if cf_o==852488 then
set c=null
return
endif
// 2. Сфера молний: при толпе у замка копим 550 и покупаем, применяем по самому живучему врагу
set it=CF_BotOrb(b)
if near<6 then
set CF_BotSave[p]=false
endif
if it==null and near>=6 then
if GetPlayerState(Player(p),PLAYER_STATE_RESOURCE_GOLD)>=550 then
call AdjustPlayerStateBJ(-550,Player(p),PLAYER_STATE_RESOURCE_GOLD)
set it=UnitAddItemById(b,'I006')
set CF_BotSave[p]=false
call CF_BotLog("bot "+I2S(p)+" buy orb")
else
set CF_BotSave[p]=true
endif
endif
if it!=null and near>=3 then
set t=CF_BotThreat(p,1200.)
if t!=null and UnitUseItemTarget(b,it,t)then
call CF_BotLog("bot "+I2S(p)+" orb on "+GetUnitName(t))
endif
set t=null
endif
set it=null
// 3. замок бьют и он ниже 85%: строитель (неуязвимый) бросает дела и чинит замок
if hp<.85 then
if cf_o!=852024 then
call IssueTargetOrderById(b,852024,c)
call CF_BotLog("bot "+I2S(p)+" repair castle "+R2S(hp))
endif
set c=null
return
endif
// 4. врагов рядом нет: свободный строитель чинит побитое здание
if near==0 and cf_o==0 then
set t=CF_BotHurtBld(p)
if t!=null then
call IssueTargetOrderById(b,852024,t)
call CF_BotLog("bot "+I2S(p)+" repair "+GetUnitName(t))
endif
set t=null
endif
set c=null
endfunction
// раз в минуту раунда: строка по каждому игроку (для пробной сборки с логом, в релизе CF_BotLog пустая)
function CF_ProbeSum takes nothing returns nothing
local integer p=0
loop
exitwhen p>11
if CF_IsBot(p)or GetPlayerSlotState(Player(p))==PLAYER_SLOT_STATE_PLAYING then
call CF_BotLog("SUM p="+I2S(p)+" bot="+I2S(IntegerTertiaryOp(CF_IsBot(p),1,0))+" team="+I2S(Fi[p+1])+" gold="+I2S(GetPlayerState(Player(p),PLAYER_STATE_RESOURCE_GOLD))+" income="+I2S(Wr[p+1])+" units="+I2S(CF_UC[p])+" castle="+R2S(GetUnitLifePercent(CF_Castle(Fi[p+1])))+" tier="+I2S(Pe[p+1])+" natural="+I2S(CF_PeN[p+1])+" forge="+I2S(CF_FA[p])+"/"+I2S(CF_FD[p])+"/"+I2S(CF_FE[p])+" cmd="+I2S(CF_Cmd[p]))
endif
set p=p+1
endloop
endfunction
function CF_BotTick takes nothing returns nothing
local integer p=0
local unit b
set CF_BT=CF_BT+3.
if ModuloInteger(R2I(CF_BT),60)<3 then
call CF_ProbeSum()
endif
loop
exitwhen p>11
if CF_IsBot(p)then
set b=CF_BotBuilder(p)
if b!=null then
call CF_BotDefend(p,b)
call CF_BotForge(p)
call CF_BotSkill(p,b)
endif
endif
set p=p+1
endloop
set b=null
endfunction
'''


GLOBALS = '''real CF_BT=0.
real CF_BotX=0.
real CF_BotY=0.
unit array CF_BotB
integer array CF_BotR
real array CF_BotNext
boolean array CF_BotSave
real array CF_StrikeT
'''

INIT = '''set t=CreateTrigger()
call TriggerRegisterTimerEventPeriodic(t,3.)
call TriggerAddAction(t,function CF_BotTick)
'''
