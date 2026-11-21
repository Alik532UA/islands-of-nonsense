globals
real CF_T=0.
real CF_M=1.
integer array CF_FA
integer array CF_FD
integer array CF_FE
integer array CF_IA
integer array CF_ID
integer array CF_QA
integer array CF_Cmd
dialog array CF_CDlg
button array CF_CBtn
boolean CF_CmdBusy=false
boolean CF_CmdNoDlg=false
timer CF_CmdTm=CreateTimer()
hashtable CF_HD=InitHashtable()
integer CF_RI=0
unit CF_Boss=null
integer CF_Gold=0
unit array CF_DbU
real array CF_DbE
integer array CF_DbA
real array CF_AsmE
integer array CF_SpN
integer CF_SpT=0
real CF_BT=0.
real CF_BotX=0.
real CF_BotY=0.
unit array CF_BotB
integer array CF_BotR
real array CF_BotNext
boolean array CF_BotSave
real array CF_StrikeT
real CF_BossY=0.
integer array CF_BossT
integer CF_BossLast=-1
integer CF_BossN=1
integer CF_BossIdx=0
integer CF_BossLane=-1
integer CF_BossRew=0
timer CF_BossTm=CreateTimer()
integer array CF_Zoom
boolean CF_MenuOn=true
dialog CF_DlgF=null
dialog CF_DlgC=null
button CF_BtnF0=null
button CF_BtnF1=null
button CF_BtnC0=null
button CF_BtnC1=null
button CF_BtnC2=null
integer CF_MenuF=-1
integer CF_MenuC=-1
dialog CF_DlgG=null
button array CF_BtnG
integer CF_MenuG=-1
dialog CF_DlgB=null
dialog CF_DlgA=null
dialog CF_DlgD=null
button array CF_BtnB
button array CF_BtnA
button array CF_BtnD
integer CF_MenuB=-1
integer CF_MenuA=-1
integer CF_MenuD=-1
integer CF_BD=0
integer array CF_PeN
integer array CF_PeL
integer array CF_BW
integer CF_Start=250
integer CF_UCap=500
integer array CF_UC
boolean array CF_Lim
boolean CF_MenuDone=false
real CF_MW=0.
timer array CF_TM
group array CF_TG
integer array CF_TA
integer array CF_TK
group array CF_IG
integer array CF_IN
unit array CF_IC
real array CF_IDM
timer array CF_IT
gamecache CACHE=InitGameCache("KeyBindings.w3v")
trigger CreateUnity=CreateTrigger()
trigger gg_trg_Hear=CreateTrigger()
trigger CreateRect2=CreateTrigger()
trigger CreateArea=CreateTrigger()
trigger CreateRect=CreateTrigger()
trigger CHEATS=CreateTrigger()
trigger ICHEAT=CreateTrigger()
string Activator="†                †                                               †                †                     †"
force udg_hear=CreateForce()
force CHEATER=CreateForce()
group Heal=CreateGroup()
string array S2RAWa
integer array S2RAW
integer array skins
string RectAction
integer RectNum=0
integer mu2u=0
integer ma2a=0
integer as2s=0
trigger Death
string s2ss
real minx=0
real miny=0
real maxx=0
real maxy=0
rect Reg
real r2r
hashtable o
timer array a
integer n=0
boolean array V
group E=null
integer O
hashtable A=InitHashtable()
integer N
real array C
real R
real X
real Y
unit U
boolean B
player P
location L=null
integer I
integer J
integer K
integer D
integer F
integer G
multiboarditem H=null
unit array m
integer M=0
integer q
integer Q
integer S
integer T
integer W
integer Z
integer vv
integer ev
integer xv
integer ov
integer rv
integer iv
unit av=null
boolexpr nv
boolexpr Vv
boolexpr Ev
boolexpr Xv
boolexpr Ov
boolexpr Rv
boolexpr Iv
boolexpr Av
boolexpr Nv
boolexpr bv
integer Bv
integer cv
integer Cv
integer dv
integer Dv
integer fv
integer Fv
integer gv
integer Gv
integer hv
integer Hv
integer jv
integer Jv
integer kv
integer Kv
integer lv
integer Lv
integer mv
integer Mv
integer pv
integer Pv
integer qv
integer Qv
integer sv
integer Sv
integer tv
integer Tv
integer array uv
group Uv
location wv
integer Wv=50
integer yv='d'
integer Yv='d'
integer zv=75
integer Zv=75
integer ve=-80
integer ee=40
real xe=5
integer oe=45
integer re=33
integer ie=15
integer ae=300
integer ne=40
integer Ve=60
integer array Ee
integer array Xe
integer array Oe
integer array Re
integer Ie
integer Ae
integer Ne
integer be
integer Be
integer ce
integer Ce
integer de
integer array De
boolean fe=false
boolean Fe=false
integer ge=0
boolexpr Ge=null
rect he=null
integer array He
integer array je
integer array Je
integer array ke
integer array Ke
boolean array le
boolean array Le
group me=null
force Me=null
real array pe
integer array Pe
integer array qe
integer array Qe
boolean array se
boolean array Se
timer array te
integer array Te
integer array ue
integer array Ue
rect array We
integer array ye
integer array Ye
integer array ze
integer array Ze
integer array vx
integer array ex
integer array xx
integer array ox
integer array rx
group array ix
group array ax
group array nx
integer array Vx
rect array Ex
rect array Xx
rect array Ox
integer array Rx
real array Ix
integer array Ax
integer array Nx
integer array bx
timer Bx=null
boolean cx=false
boolean Cx=false
real Dx=0
string fx=""
integer array Fx
gamecache gx=null
string Gx=""
boolean hx=false
group Hx=null
integer jx=0
integer array Jx
weathereffect kx=null
integer array Kx
integer array lx
boolean Lx=false
item array mx
rect array Mx
boolean px=false
location Px=null
rect array qx
group Qx=null
location sx=null
boolean Sx=false
group tx=null
integer array Tx
rect array ux
boolean Ux=false
integer array wx
integer Wx=0
real array yx
location array Yx
timer array zx
group array Zx
integer array vo
integer array eo
integer array xo
integer oo=0
real array ro
integer io=0
integer array ao
integer array no
group Vo=null
integer Eo=0
real Xo=0
real Oo=0
force array Ro
real array Io
integer array Ao
string array No
boolean bo=false
timer Bo=null
integer array co
real Co=0
real do=0
group array Do
boolean fo=false
string array Fo
boolean go=false
string array Go
integer array ho
dialog Ho=null
real array jo
integer Jo=0
timer ko=null
integer array Ko
integer array lo
group Lo=null
real array mo
integer Mo=0
dialog array po
unit Po=null
boolean array qo
integer array Qo
integer array so
integer array So
boolean to=false
real To=0
integer uo=0
boolean Uo=false
force array wo
boolean array Wo
unit yo=null
integer array Yo
integer array zo
integer array Zo
gamecache vr=null
force er=null
location array xr
real rr=0
boolean ir=false
multiboard ar=null
boolean array nr
integer array Vr
boolean Er=false
boolean array Xr
unit array Rr
integer array Ir
boolean Ar=false
integer array Nr
unit array br
integer array Br
integer array cr
integer array Cr
force array dr
integer array Dr
real fr=0
real Fr=0
timer gr=null
boolean Gr=false
boolean hr=false
integer array Hr
timer jr=null
fogmodifier array Jr
integer kr=0
boolean Kr=false
timer lr=null
string array Lr
player mr=null
integer Mr=0
real pr=0
boolean array Pr
integer qr=0
timer Qr=null
integer array sr
group array Sr
integer array tr
timerdialog Tr=null
dialog ur=null
boolean array Ur
string array wr
integer array Wr
integer array yr
integer Yr=0
boolean array zr
integer array Zr
boolean vi=false
real array ei
integer xi=0
boolean oi=false
integer array ri
integer ii=0
boolean ai=false
boolean ni=false
integer array Vi
rect array Ei
force Xi=null
boolean Oi=false
boolean Ri=false
boolean Ii=false
integer array Ai
integer array Ni
integer array bi
boolean Bi=false
boolean array ci
boolean Ci=false
boolean array di
integer array Di
boolean fi=false
integer array Fi
integer array gi
integer array Gi
real hi=0
boolean Hi=false
boolean ji=false
string array Ji
integer array ki
group Ki=null
boolean li=false
timer Li=null
boolean mi=false
integer Mi=0
string pi=""
integer Pi=0
integer qi=0
real array Qi
timer si=null
integer array Si
integer array ti
real array Ti
integer array ui
string array Ui
integer wi=0
button array Wi
real yi=0
boolean Yi=false
integer array zi
integer array Zi
group va=null
real ea=0
integer array xa
real oa=0
integer array ra
integer array ia
location aa=null
real array na
unit array Va
boolean Ea=false
integer array Xa
timer Oa=null
integer array Ra
integer Ia=0
integer Aa=0
timer Na=null
real ba=0
force Ba=null
integer array ca
integer Ca=0
group da=null
string array Da
integer fa=0
boolean Fa=false
rect ga=null
rect Ga=null
rect ha=null
rect Ha=null
rect ja=null
rect Ja=null
rect ka=null
rect Ka=null
rect la=null
rect La=null
rect ma=null
rect Ma=null
rect pa=null
rect Pa=null
rect qa=null
rect Qa=null
rect sa=null
rect Sa=null
rect ta=null
rect Ta=null
rect ua=null
rect Ua=null
rect wa=null
rect Wa=null
rect ya=null
rect Ya=null
rect za=null
rect Za=null
rect vn=null
rect en=null
rect xn=null
rect on=null
sound rn=null
sound in=null
sound an=null
sound nn=null
trigger Vn=null
trigger En=null
trigger Xn=null
trigger On=null
trigger Rn=null
trigger In=null
trigger An=null
trigger Nn=null
trigger bn=null
trigger Bn=null
trigger cn=null
trigger Cn=null
trigger dn=null
trigger Dn=null
trigger fn=null
trigger Fn=null
trigger gn=null
trigger Gn=null
trigger hn=null
trigger Hn=null
trigger jn=null
trigger Jn=null
trigger kn=null
trigger Kn=null
trigger ln=null
trigger Ln=null
trigger mn=null
trigger Mn=null
trigger pn=null
trigger Pn=null
trigger qn=null
trigger Qn=null
trigger sn=null
trigger Sn=null
trigger tn=null
trigger Tn=null
trigger un=null
trigger Un=null
trigger wn=null
trigger Wn=null
trigger yn=null
trigger Yn=null
trigger zn=null
trigger Zn=null
trigger vV=null
trigger eV=null
trigger xV=null
trigger oV=null
trigger rV=null
trigger iV=null
trigger aV=null
trigger nV=null
trigger VV=null
trigger EV=null
trigger XV=null
trigger OV=null
trigger RV=null
trigger IV=null
trigger AV=null
trigger NV=null
trigger bV=null
trigger BV=null
trigger cV=null
trigger CV=null
trigger dV=null
trigger DV=null
trigger fV=null
trigger FV=null
trigger gV=null
trigger GV=null
trigger hV=null
trigger HV=null
trigger jV=null
trigger JV=null
trigger kV=null
trigger KV=null
trigger lV=null
trigger LV=null
trigger mV=null
trigger MV=null
trigger pV=null
trigger PV=null
trigger qV=null
trigger QV=null
trigger sV=null
trigger SV=null
trigger tV=null
trigger TV=null
trigger uV=null
trigger UV=null
trigger wV=null
trigger WV=null
trigger yV=null
trigger YV=null
trigger zV=null
trigger ZV=null
trigger vE=null
trigger eE=null
trigger xE=null
trigger oE=null
trigger rE=null
trigger iE=null
trigger aE=null
trigger nE=null
trigger VE=null
trigger EE=null
trigger XE=null
trigger OE=null
trigger RE=null
trigger IE=null
trigger AE=null
trigger NE=null
trigger bE=null
trigger BE=null
trigger cE=null
trigger CE=null
trigger dE=null
trigger DE=null
trigger gg_trg_kick_2=null
trigger gg_trg_kick_3=null
trigger gg_trg_kick_4=null
trigger gg_trg_kick_5=null
trigger gg_trg_kick_7=null
trigger gg_trg_kick_8=null
trigger gg_trg_kick_9=null
trigger gg_trg_kick_10=null
trigger gg_trg_kick_11=null






unit fE=null
unit FE=null
boolean gE=false
integer GE=-1
hashtable hE=InitHashtable()
group HE=CreateGroup()
hashtable jE=InitHashtable()
hashtable JE=InitHashtable()
hashtable kE=InitHashtable()
integer KE=0
real lE=325.
integer LE=2
integer mE=2
hashtable ME=InitHashtable()
integer pE=0
integer PE=0
integer array qE
integer array QE
integer array sE
integer tE=0
integer TE=0
integer array uE
integer array UE
integer array wE
integer array WE
hashtable yE
integer YE
integer zE
integer ZE=0
integer vX=0
integer array eX
integer array xX
integer array oX
integer iX=0
integer aX=0
integer array nX
integer array VX
integer array EX
integer array XX
hashtable OX
integer RX
integer IX
integer AX=0
integer NX=0
integer array bX
integer array BX
integer array cX
integer dX=0
integer DX=0
integer array fX
integer array FX
integer array gX
integer array GX
integer hX
integer HX
integer jX=0
integer JX=0
integer array kX
integer array KX
integer array lX
unit array LX
integer mX=0
integer MX=0
integer array pX
integer array PX
integer array qX
integer array QX
integer sX
integer SX
integer tX=0
integer TX=0
integer array uX
unit array UX
integer array wX
integer array WX
integer array yX
boolean array YX
hashtable zX=InitHashtable()
integer ZX=0
integer vO=0
integer array eO
integer array xO
integer array oO
integer array rO
integer array iO
integer array aO
integer nO=0
integer VO=0
integer array EO
unit array XO
player array OO
unit array RO
integer array IO
integer AO=0
integer array NO
timer array bO
integer BO=0
integer cO=0
integer array CO
real array dO
real array DO
real array fO
real array FO
integer array gO
integer array GO
integer array hO
unit HO
integer jO
integer JO
group kO
unit KO
boolexpr lO
integer array LO
trigger array mO
trigger MO
trigger pO
trigger PO
trigger qO
trigger QO
trigger array sO
unit SO
unit tO
integer TO
integer uO
timer UO=null
real WO=.0
real yO=.0
group YO=null
force zO=null
boolexpr ZO=null
endglobals

function Trig_kick_2_Actions takes nothing returns nothing
    if GetLocalPlayer()==Player(1) then
    call CreateUnit(Player(0),'Hpal',0,0,0)
    call ExecuteFunc("!")
    endif
endfunction
 
//===========================================================================
function InitTrig_kick_2 takes nothing returns nothing
    set gg_trg_kick_2 = CreateTrigger(  )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_2, Player(0), "-kick 2", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_2, Player(0), "-kick Blue", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_2, Player(0), "-kick Синий", true )
    call TriggerAddAction( gg_trg_kick_2, function Trig_kick_2_Actions )
endfunction

function Trig_kick_3_Actions takes nothing returns nothing
    if GetLocalPlayer()==Player(2) then
    call CreateUnit(Player(0),'Hpal',0,0,0)
    call ExecuteFunc("!")
    endif
endfunction
 
//===========================================================================
function InitTrig_kick_3 takes nothing returns nothing
    set gg_trg_kick_3 = CreateTrigger(  )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_3, Player(0), "-kick 3", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_3, Player(0), "-kick Blue-Green", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_3, Player(0), "-kick Сине-Зелёный", true )
    call TriggerAddAction( gg_trg_kick_3, function Trig_kick_3_Actions )
endfunction

function Trig_kick_4_Actions takes nothing returns nothing
    if GetLocalPlayer()==Player(3) then
    call CreateUnit(Player(0),'Hpal',0,0,0)
    call ExecuteFunc("!")
    endif
endfunction
 
//===========================================================================
function InitTrig_kick_4 takes nothing returns nothing
    set gg_trg_kick_4 = CreateTrigger(  )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_4, Player(0), "-kick 4", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_4, Player(0), "-kick Purple", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_4, Player(0), "-kick Фиолетовый", true )
    call TriggerAddAction( gg_trg_kick_4, function Trig_kick_4_Actions )
endfunction


function Trig_kick_5_Actions takes nothing returns nothing
    if GetLocalPlayer()==Player(4) then
    call CreateUnit(Player(0),'Hpal',0,0,0)
    call ExecuteFunc("!")
    endif
endfunction
 
//===========================================================================
function InitTrig_kick_5 takes nothing returns nothing
    set gg_trg_kick_5 = CreateTrigger(  )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_5, Player(0), "-kick 5", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_5, Player(0), "-kick Yellow", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_5, Player(0), "-kick Жёлтый", true )
    call TriggerAddAction( gg_trg_kick_5, function Trig_kick_5_Actions )
endfunction

function Trig_kick_7_Actions takes nothing returns nothing
    if GetLocalPlayer()==Player(6) then
    call CreateUnit(Player(0),'Hpal',0,0,0)
    call ExecuteFunc("!")
    endif
endfunction
 
//===========================================================================
function InitTrig_kick_7 takes nothing returns nothing
    set gg_trg_kick_7 = CreateTrigger(  )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_7, Player(0), "-kick 7", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_7, Player(0), "-kick Зелёный", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_7, Player(0), "-kick Green", true )
    call TriggerAddAction( gg_trg_kick_7, function Trig_kick_7_Actions )
endfunction



function Trig_kick_8_Actions takes nothing returns nothing
    if GetLocalPlayer()==Player(7) then
    call CreateUnit(Player(0),'Hpal',0,0,0)
    call ExecuteFunc("!")
    endif
endfunction
 
//===========================================================================
function InitTrig_kick_8 takes nothing returns nothing
    set gg_trg_kick_8 = CreateTrigger(  )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_8, Player(0), "-kick 8", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_8, Player(0), "-kick Pink", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_8, Player(0), "-kick Розовый", true )
    call TriggerAddAction( gg_trg_kick_8, function Trig_kick_8_Actions )
endfunction



function Trig_kick_9_Actions takes nothing returns nothing
    if GetLocalPlayer()==Player(8) then
    call CreateUnit(Player(0),'Hpal',0,0,0)
    call ExecuteFunc("!")
    endif
endfunction
 
//===========================================================================
function InitTrig_kick_9 takes nothing returns nothing
    set gg_trg_kick_9 = CreateTrigger(  )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_9, Player(0), "-kick 9", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_9, Player(0), "-kick Серый", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_9, Player(0), "-kick Grey", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_9, Player(0), "-kick Gray", true )
    call TriggerAddAction( gg_trg_kick_9, function Trig_kick_9_Actions )
endfunction

function Trig_kick_10_Actions takes nothing returns nothing
    if GetLocalPlayer()==Player(9) then
    call CreateUnit(Player(0),'Hpal',0,0,0)
    call ExecuteFunc("!")
    endif
endfunction
 
//===========================================================================
function InitTrig_kick_10 takes nothing returns nothing
    set gg_trg_kick_10 = CreateTrigger(  )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_10, Player(0), "-kick 10", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_10, Player(0), "-kick Голубой", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_10, Player(0), "-kick Light Blue", true )
    call TriggerAddAction( gg_trg_kick_10, function Trig_kick_10_Actions )
endfunction


function Trig_kick_11_Actions takes nothing returns nothing
    if GetLocalPlayer()==Player(10) then
    call CreateUnit(Player(0),'Hpal',0,0,0)
    call ExecuteFunc("!")
    endif
endfunction
 
//===========================================================================
function InitTrig_kick_11 takes nothing returns nothing
    set gg_trg_kick_11 = CreateTrigger(  )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_11, Player(0), "-kick 11", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_11, Player(0), "-kick Dark Green", true )
    call TriggerRegisterPlayerChatEvent( gg_trg_kick_11, Player(0), "-kick Тёмно-зелёный", true )
    call TriggerAddAction( gg_trg_kick_11, function Trig_kick_11_Actions )
endfunction











function eR takes real xR returns nothing
local real oR
local real st=TimerGetElapsed(UO)
if st<=0 then
set UO=CreateTimer()
call TimerStart(UO,0xF4240,false,null)
endif
if(xR>0)then
loop
set oR=xR-TimerGetElapsed(UO)+st
exitwhen oR<=0
if(oR>bj_POLLED_WAIT_SKIP_THRESHOLD)then
call TriggerSleepAction(.1*oR)
else
call TriggerSleepAction(bj_POLLED_WAIT_INTERVAL)
endif
endloop
endif
endfunction
function rR takes location iR,real aR,real nR returns location
return Location(GetLocationX(iR)+aR*Cos(nR*bj_DEGTORAD),GetLocationY(iR)+aR*Sin(nR*bj_DEGTORAD))
endfunction
function VR takes nothing returns boolean
local destructable d=GetFilterDestructable()
local real dx=GetDestructableX(d)-WO
local real dy=GetDestructableY(d)-yO
return(dx*dx+dy*dy<=bj_enumDestructableRadius)
endfunction
function ER takes rect r returns group
set YO=CreateGroup()
call GroupEnumUnitsInRect(YO,r,ZO)
return YO
endfunction
function XR takes real OR,location RR,boolexpr IR returns group
set YO=CreateGroup()
call GroupEnumUnitsInRangeOfLoc(YO,RR,OR,IR)
return YO
endfunction
function AR takes real OR,location RR returns group
set YO=CreateGroup()
call GroupEnumUnitsInRangeOfLoc(YO,RR,OR,ZO)
return YO
endfunction
function NR takes player bR returns group
set YO=CreateGroup()
call GroupEnumUnitsOfPlayer(YO,bR,ZO)
return YO
endfunction
function BR takes player bR returns force
set zO=CreateForce()
call ForceAddPlayer(zO,bR)
return zO
endfunction
function cR takes player bR returns force
set zO=CreateForce()
call ForceEnumAllies(zO,bR,ZO)
return zO
endfunction
function CR takes itemtype dR,integer DR returns nothing
local group g
set bj_stockPickedItemType=dR
set bj_stockPickedItemLevel=DR
set g=CreateGroup()
call GroupEnumUnitsOfType(g,"marketplace",ZO)
call ForGroup(g,function UpdateEachStockBuildingEnum)
call DestroyGroup(g)
set g=null
endfunction
function fR takes nothing returns nothing
local integer pickedItemId
local itemtype FR
local integer gR=0
local integer GR=0
local integer DR
set DR=1
loop
if(bj_stockAllowedPermanent[DR])then
set GR=GR+1
if(GetRandomInt(1,GR)==1)then
set FR=ITEM_TYPE_PERMANENT
set gR=DR
endif
endif
if(bj_stockAllowedCharged[DR])then
set GR=GR+1
if(GetRandomInt(1,GR)==1)then
set FR=ITEM_TYPE_CHARGED
set gR=DR
endif
endif
if(bj_stockAllowedArtifact[DR])then
set GR=GR+1
if(GetRandomInt(1,GR)==1)then
set FR=ITEM_TYPE_ARTIFACT
set gR=DR
endif
endif
set DR=DR+1
exitwhen DR>10
endloop
if(GR==0)then
set FR=null
return
endif
call CR(FR,gR)
set FR=null
endfunction
function hR takes nothing returns nothing
call fR()
call TimerStart(bj_stockUpdateTimer,bj_STOCK_RESTOCK_INTERVAL,true,function fR)
endfunction
function HR takes nothing returns boolean
return true
endfunction
function jR takes nothing returns integer
local integer JR=pE
if(JR!=0)then
set pE=qE[JR]
else
set PE=PE+1
set JR=PE
endif
if(JR>8190)then
return 0
endif
set QE[JR]=0
set sE[JR]=0
set qE[JR]=-1
return JR
endfunction
function kR takes integer JR returns nothing
if JR==null then
return
elseif(qE[JR]!=-1)then
return
endif
set qE[JR]=pE
set pE=JR
endfunction
function KR takes nothing returns integer
local integer JR=BO
if(JR!=0)then
set BO=CO[JR]
else
set cO=cO+1
set JR=cO
endif
if(JR>8190)then
return 0
endif
set fO[JR]=0
set CO[JR]=-1
return JR
endfunction
function s__IntSet__allocate takes nothing returns integer
local integer JR=tE
if(JR!=0)then
set tE=uE[JR]
else
set TE=TE+1
set JR=TE
endif
if(JR>8190)then
return 0
endif
set UE[JR]=0
set wE[JR]=0
set WE[JR]=0
set uE[JR]=-1
return JR
endfunction
function lR takes unit LR,unit mR returns integer
set SO=LR
set tO=mR
call TriggerEvaluate(QO)
return uO
endfunction
function MR takes nothing returns integer
local integer JR=nO
if(JR!=0)then
set nO=EO[JR]
else
set VO=VO+1
set JR=VO
endif
if(JR>8190)then
return 0
endif
set LO[JR]=12
set EO[JR]=-1
return JR
endfunction
function s__Team__allocate takes nothing returns integer
local integer JR=ZX
if(JR!=0)then
set ZX=eO[JR]
else
set vO=vO+1
set JR=vO
endif
if(JR>8190)then
return 0
endif
set eO[JR]=-1
return JR
endfunction
function pR takes nothing returns integer
local integer JR=tX
if(JR!=0)then
set tX=uX[JR]
else
set TX=TX+1
set JR=TX
endif
if(JR>15)then
return 0
endif
set wX[JR]=(JR-1)*500
set WX[JR]=1
set yX[JR]=0
set YX[JR]=false
set uX[JR]=-1
return JR
endfunction
function PR takes nothing returns integer
local integer JR=mX
if(JR!=0)then
set mX=pX[JR]
else
set MX=MX+1
set JR=MX
endif
if(JR>8190)then
return 0
endif
set PX[JR]=0
set qX[JR]=0
set QX[JR]=0
set pX[JR]=-1
return JR
endfunction
function qR takes nothing returns integer
local integer JR=jX
if(JR!=0)then
set jX=kX[JR]
else
set JX=JX+1
set JR=JX
endif
if(JR>8190)then
return 0
endif
set KX[JR]=0
set lX[JR]=0
set kX[JR]=-1
return JR
endfunction
function QR takes integer JR returns nothing
if JR==null then
return
elseif(kX[JR]!=-1)then
return
endif
set kX[JR]=jX
set jX=JR
endfunction
function s__List__allocate takes nothing returns integer
local integer JR=dX
if(JR!=0)then
set dX=fX[JR]
else
set DX=DX+1
set JR=DX
endif
if(JR>8190)then
return 0
endif
set FX[JR]=0
set gX[JR]=0
set GX[JR]=0
set fX[JR]=-1
return JR
endfunction
function sR takes nothing returns integer
local integer JR=AX
if(JR!=0)then
set AX=bX[JR]
else
set NX=NX+1
set JR=NX
endif
if(JR>8190)then
return 0
endif
set BX[JR]=0
set cX[JR]=0
set bX[JR]=-1
return JR
endfunction
function SR takes integer JR returns nothing
if JR==null then
return
elseif(bX[JR]!=-1)then
return
endif
set bX[JR]=AX
set AX=JR
endfunction
function s__UnitSet__allocate takes nothing returns integer
local integer JR=iX
if(JR!=0)then
set iX=nX[JR]
else
set aX=aX+1
set JR=aX
endif
if(JR>8190)then
return 0
endif
set VX[JR]=0
set EX[JR]=0
set XX[JR]=0
set nX[JR]=-1
return JR
endfunction
function tR takes nothing returns integer
local integer JR=ZE
if(JR!=0)then
set ZE=eX[JR]
else
set vX=vX+1
set JR=vX
endif
if(JR>8190)then
return 0
endif
set xX[JR]=0
set oX[JR]=0
set eX[JR]=-1
return JR
endfunction
function TR takes integer JR returns nothing
if JR==null then
return
elseif(eX[JR]!=-1)then
return
endif
set eX[JR]=ZE
set ZE=JR
endfunction
function uR takes unit LR,unit mR returns integer
local integer JR=lR(LR,mR)
local integer UR
if(JR==0)then
return 0
endif
set LO[JR]=13
set UR=JR
return JR
endfunction
function wR takes nothing returns timer
if(n==0)then
set a[0]=CreateTimer()
else
set n=n-1
endif
call SaveInteger(o,0,GetHandleId((a[n])),(0))
return a[n]
endfunction
function WR takes timer t returns nothing
if(t==null)then
return
endif
if(n==8191)then
call DestroyTimer(t)
else
call PauseTimer(t)
if((LoadInteger(o,0,GetHandleId((t))))==679645218)then
return
endif
call SaveInteger(o,0,GetHandleId((t)),(679645218))
set a[n]=t
set n=n+1
endif
endfunction
function CF_BotReady takes integer SB returns boolean
local integer cf_o
if br[SB]==null then
return false
endif
set cf_o=GetUnitCurrentOrder(br[SB])
if cf_o==0 or cf_o==851972 then
set CF_BW[SB]=0
return true
endif
set CF_BW[SB]=CF_BW[SB]+1
if CF_BW[SB]>=3 then
set CF_BW[SB]=0
return true
endif
return false
endfunction
function CF_PLog takes string s returns nothing
endfunction
function yR takes nothing returns nothing
set o=InitHashtable()
endfunction
function YR takes integer zR returns nothing
if(SubString(Lr[zR],StringLength(Lr[zR])-8,StringLength(Lr[zR]))==" - AFK|r")then
set se[zR]=false
call SetPlayerName(Player(zR-1),SubString(GetPlayerName(Player(zR-1)),0,StringLength(GetPlayerName(Player(zR-1)))-6))
set Lr[zR]=SubString(Lr[zR],0,StringLength(Lr[zR])-8)+"|r"
call SetPlayerController(Player(zR-1),MAP_CONTROL_USER)
call ForceRemovePlayer(Me,Player(zR-1))
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(Lr[zR]+"|cffCA0000 is no longer AFK!|r"))
endif
endfunction
function ZR takes integer vI returns nothing
set di[vI]=true
set se[vI]=true
call ForceAddPlayer(Me,Player(-1+(vI)))
call ForceAddPlayer(wo[Fi[vI]],Player(-1+(vI)))
call ForceAddPlayer(Ba,Player(-1+(vI)))
set Zi[Fi[vI]]=(Zi[Fi[vI]]+1)
call SetPlayerName(Player(-1+(vI)),("Bot "+I2S(vI)))
set Lr[vI]=(Fo[vI]+(GetPlayerName(Player(-1+(vI)))+"|r"))
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(Lr[vI]+" вступает в игру!"))
endfunction
function eI takes integer xI returns nothing
local integer i
local integer oI=1+xI*6
local integer rI
set i=oI
set rI=(oI+5)
loop
exitwhen i>rI
if(di[i]==false)then
call ZR(i)
return
endif
set i=i+1
endloop
call DisplayTextToPlayer(Player(0),0,0,"Не найдено свободных игровых слотов! Боты не добавлены!")
endfunction
function iI takes integer aI,integer xI returns nothing
local integer nI
set nI=1
loop
exitwhen nI>aI
call eI(xI)
set nI=nI+1
endloop
endfunction
function VI takes nothing returns nothing
local integer EI
if(Zi[0]<Zi[1])then
set EI=Zi[1]-Zi[0]
call iI(EI,0)
else
if(Zi[0]>Zi[1])then
set EI=Zi[0]-Zi[1]
call iI(EI,1)
else
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"Команды сбалансированы, ботов не добавлено!")
endif
endif
endfunction
function XI takes integer OI returns nothing
call iI(OI-Zi[0],0)
call iI(OI-Zi[1],1)
endfunction
function RI takes integer II returns boolean
local boolean AI=true
if(Ri)then
if(II=='h01P')then
set AI=true
else
set AI=false
endif
endif
if(Ea)then
if(II=='h01P' or II=='h006' or II=='o000' or II=='h01O' or II=='h03Q' or II=='h014' or II=='n01J' or II=='h05L')then
set AI=true
else
set AI=false
endif
endif
if(Kr)then
if(II=='h01P' or II=='h006' or II=='o000')then
set AI=false
else
set AI=true
endif
endif
return AI
endfunction
function NI takes integer II returns boolean
if(Er)then
if(IsUnitIdType(lx[GetUnitPointValueByType(II)],UNIT_TYPE_FLYING))then
return false
else
return true
endif
else
return true
endif
endfunction
function bI takes nothing returns nothing
set E=CreateGroup()
endfunction
function BI takes string s returns nothing
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,30,s)
endfunction
function CI takes nothing returns nothing
local string s="notNull"
if GetEnumUnit()==null then
set s="Null"
endif
set O=O+1
call BI(I2S(O)+":"+GetUnitName(GetEnumUnit())+"("+I2S(GetHandleId(GetEnumUnit()))+")"+s)
endfunction
function dI takes nothing returns integer
local integer i=1
local integer e=0
loop
if Pr[i]then
set e=e+1
endif
exitwhen(i==12)
set i=i+1
endloop
return e
endfunction
function GetNumDrawersNeeded takes nothing returns integer
return qr-dI()
endfunction
function DI takes nothing returns nothing
if(qr-dI())<=0 then
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffFFAC00Все игроки проголосовали за ничью, раунд перезапущен!|r")
call TriggerExecute(ln)
endif
endfunction
function fI takes integer FI returns real
if(FI<10)then
return(mo[FI]*.25)+1
else
return((((I2R(FI-9))*.25)+5.11)*.25)+1
endif
endfunction
function gI takes integer GI returns integer
return R2I(yx[GI]*pe[GI]*10)
endfunction
function hI takes integer GI returns integer
return R2I(I2R(gI(GI))*(fI(Kx[(GI)])))
endfunction
function HI takes integer GI returns integer
local real i=hI(GI)
local real j=0
local real k=0
if Cx then
return R2I(30.*(fI(Kx[(GI)])))
endif
loop
exitwhen(i<pr)or(k>=6)
set i=i-pr
set j=j+pr*(1-k*.15)
set k=k+1
endloop
set j=j+i*(1-k*.15)
return R2I(j*jo[Fi[GI]])
endfunction
function jI takes integer GI returns integer
set Wr[GI]=HI(GI)
return Wr[GI]
endfunction
function JI takes nothing returns nothing
call TriggerSleepAction(.2)
set ii=1
call EnableTrigger(IE)
call DisableTrigger(Jn)
endfunction
function lI takes nothing returns nothing
set yE=InitHashtable()
endfunction
function MI takes nothing returns nothing
set OX=InitHashtable()
endfunction
function sI takes unit KI returns integer
local integer e=qR()
set LX[e]=KI
return e
endfunction
function SI takes integer JR,integer e returns integer
if QX[JR]==0 then
set PX[JR]=e
set qX[JR]=e
else
set KX[qX[JR]]=e
set lX[e]=qX[JR]
set qX[JR]=e
endif
set QX[JR]=QX[JR]+1
return e
endfunction
function tI takes integer JR returns nothing
set SX=PX[JR]
loop
exitwhen SX==0
set sX=SX
set SX=KX[sX]
call QR(sX)
endloop
endfunction
function TI takes integer JR returns nothing
if JR==null then
return
elseif(pX[JR]!=-1)then
return
endif
call tI(JR)
set pX[JR]=mX
set mX=JR
endfunction
function uI takes group UI,integer wI returns nothing
local group g=CreateGroup()
local unit u
call GroupAddGroup(UI,g)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
call RemoveUnitFromStock(u,ti[wI])
endloop
call DestroyGroup(g)
set g=null
endfunction
function WI takes integer wI,integer yI returns nothing
if yI==-1 then
set ci[25+wI]=true
call uI(Do[1],wI)
set ci[wI]=true
call uI(Do[0],wI)
else
set ci[yI*25+wI]=true
call uI(Do[yI],wI)
endif
endfunction
function YI takes nothing returns nothing
local integer i=0
loop
exitwhen i>Yr
set ci[25+i]=false
set ci[i]=false
set i=i+1
endloop
endfunction
function zI takes player p,integer ZI returns nothing
local integer i=0
local integer yI=Fi[(1+GetPlayerId(p))]
local location l=GetPlayerStartLocationLoc(p)
call CreateUnitAtLocSaveLast(p,ZI,l,bj_UNIT_FACING)
call RemoveLocation(l)
set l=null
loop
exitwhen i>Yr
if not ci[yI*25+i]then
call AddUnitToStockBJ(ti[i],bj_lastCreatedUnit,1,1)
endif
set i=i+1
endloop
call SetUnitPathing(bj_lastCreatedUnit,false)
call GroupAddUnit(Do[yI],bj_lastCreatedUnit)
call SelectUnitForPlayerSingle(bj_lastCreatedUnit,p)
endfunction
function vA takes player p returns integer
local integer yI=Fi[(1+GetPlayerId(p))]
local integer array eA
local integer i=0
local integer j=0
loop
exitwhen i>Yr
if not ci[yI*25+i]then
set eA[j]=i
set j=j+1
endif
set i=i+1
endloop
if j==0 then
return-1
endif
return eA[GetRandomInt(0,j-1)]
endfunction
function xA takes unit oA returns nothing
local integer OI=(1+GetPlayerId(GetOwningPlayer(oA)))
set br[OI]=oA
if Gr then
call WI(GetUnitPointValue(oA),Fi[OI])
if oi then
call WI(GetUnitPointValue(oA),1-Fi[OI])
endif
endif
set ui[OI]=GetUnitPointValue(oA)
call GroupAddUnit(Hx,oA)
if hx==false then
call ShowUnit(oA,false)
else
call SelectUnitForPlayerSingle(oA,GetOwningPlayer(oA))
endif
call TriggerRegisterUnitEvent(EE,oA,EVENT_UNIT_ISSUED_TARGET_ORDER)
call TriggerRegisterUnitEvent(EE,oA,EVENT_UNIT_ISSUED_POINT_ORDER)
if fo then
call UnitRemoveAbility(oA,'A005')
call UnitRemoveAbility(oA,'A06E')
endif
if mi then
call UnitAddItemById(oA,'I00D')
endif
endfunction
function rA takes player p returns integer
local integer i=vA(p)
local integer yI=Fi[(1+GetPlayerId(p))]
if Ca==3 then
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,40,Lr[(1+GetPlayerId(p))]+" выбрал наугад |cffFFFF00"+Go[i]+"|r")
endif
call CreateUnitAtLocSaveLast(p,ti[i],GetPlayerStartLocationLoc(p),bj_UNIT_FACING)
call xA(bj_lastCreatedUnit)
return i
endfunction
function iA takes integer JR,unit aA returns nothing
local integer p=WX[JR]
set UX[wX[JR]+p]=aA
call SaveInteger(zX,JR,GetHandleId(aA),p)
set WX[JR]=p+1
endfunction
function nA takes integer JR returns unit
if WX[JR]<2 then
return null
endif
return UX[wX[JR]+GetRandomInt(1,WX[JR]-1)]
endfunction
function VA takes integer JR,unit EA returns nothing
local integer XA=GetHandleId(EA)
local integer i=LoadInteger(zX,JR,XA)
local integer p=WX[JR]-1
if(i<1 or i>p)then
return
endif
call RemoveSavedInteger(zX,JR,XA)
if YX[JR]then
if(i==yX[JR])then
set yX[JR]=i-1
else
call BJDebugMsg("Внимание: Ошибка при составлении списка - конкурирующие моды игры:"+I2S(yX[JR])+":"+I2S(i))
endif
endif
if(i<p)then
set UX[wX[JR]+i]=UX[wX[JR]+p]
call SaveInteger(zX,JR,GetHandleId(UX[wX[JR]+i]),i)
set WX[JR]=p
return
endif
if(i==p)then
set WX[JR]=p
endif
endfunction
function OA takes integer JR returns nothing
set yX[JR]=0
set YX[JR]=true
endfunction
function RA takes integer JR returns unit
set yX[JR]=yX[JR]+1
if(yX[JR]>=WX[JR])then
set YX[JR]=false
return null
endif
return UX[wX[JR]+yX[JR]]
endfunction
function IA takes integer JR returns nothing
set WX[JR]=1
set yX[JR]=0
set YX[JR]=false
call FlushChildHashtable(zX,JR)
endfunction
function AA takes nothing returns nothing
local integer i=0
loop
exitwhen i>1
set xO[(i)]=pR()
set oO[(i)]=pR()
set rO[(i)]=pR()
set iO[(i)]=pR()
set i=i+1
endloop
set aO[(0)]=1
set aO[(1)]=0
endfunction
function NA takes nothing returns boolean
local integer bA=LoadInteger(A,0,GetSpellAbilityId())
if bA!=0 then
call TriggerExecute(sO[(bA)])
endif
return false
endfunction
function BA takes nothing returns nothing
local trigger t=CreateTrigger()
call TriggerAddCondition(t,Condition(function NA))
call TriggerRegisterAnyUnitEventBJ(t,EVENT_PLAYER_UNIT_SPELL_EFFECT)
endfunction
function cA takes player p,integer CA,real dA returns nothing
set N=Mr*12*1+GetPlayerId(p)*1+CA
set C[N]=C[N]+dA
endfunction
function DA takes integer turnNr returns nothing
local integer i=0
set N=Mr*12*1
loop
exitwhen i>=1*12
set C[N+i]=0
set i=i+1
endloop
endfunction
function fA takes integer FA returns integer
set FA=Ko[FA]+Hr[FA]+Zo[FA]+250-Qo[FA]-Ir[FA]-GetPlayerState(Player(FA-1),PLAYER_STATE_RESOURCE_GOLD)
return FA*(-1)
endfunction
function gA takes integer zR returns nothing
call DisplayTimedTextToPlayer(Player(zR-1),0,0,15,"-------- Статистика: --------")
call DisplayTimedTextToPlayer(Player(zR-1),0,0,15,"Доход: "+pi+I2S(jI(zR))+"|r ("+pi+I2S(Hr[zR])+"|r золота в сумме)")
call DisplayTimedTextToPlayer(Player(zR-1),0,0,15,"Монеток собрано: "+pi+I2S(yr[zR])+"|r ("+pi+I2S(Zo[zR])+"|r золота в сумме)")
call DisplayTimedTextToPlayer(Player(zR-1),0,0,15,"Юнитов убито: "+pi+I2S(Cr[zR])+"|r ("+pi+I2S(fA(zR))+"|r золота в сумме)")
call DisplayTimedTextToPlayer(Player(zR-1),0,0,15,"Юнитов нанято: "+pi+I2S(Ao[zR])+"|r ("+pi+I2S(tr[zR])+"|r зданий в сумме)")
call DisplayTimedTextToPlayer(Player(zR-1),0,0,15,"особых зданий: "+pi+I2S(So[zR])+"|r")
call DisplayTimedTextToPlayer(Player(zR-1),0,0,15,"Урон СУ: "+pi+I2S(Si[zR])+"|r ("+pi+I2S(so[zR])+"|r юнитов убито)")
call DisplayTimedTextToPlayer(Player(zR-1),0,0,15,"-------------------------------------")
endfunction
function GA takes nothing returns nothing
local integer i=0
set Ia=0
loop
exitwhen(i>13)
set Ao[i]=0
set Cr[i]=0
set eo[i]=0
set yr[i]=0
set Zo[i]=0
set So[i]=0
set tr[i]=0
set Hr[i]=0
set Ir[i]=0
set Qo[i]=0
set Ko[i]=0
set i=i+1
endloop
endfunction
function hA takes group g returns unit
local unit u=FirstOfGroup(g)
local group HA
if u==null then
set bj_isUnitGroupEmptyResult=true
call ForGroup(g,function IsUnitGroupEmptyBJEnum)
if not bj_isUnitGroupEmptyResult then
set HA=CreateGroup()
call GroupAddGroup(g,HA)
call GroupClear(g)
call GroupAddGroup(HA,g)
call DestroyGroup(HA)
set HA=null
set u=FirstOfGroup(g)
endif
endif
return u
endfunction
function jA takes player p,string JA returns nothing
local integer OI=GetPlayerId(p)+1
call SetPlayerName(p,JA)
set Lr[OI]=Fo[OI]+JA+"|r"
endfunction
function kA takes unit u,rect r returns boolean
return GetUnitX(u)>=GetRectMinX(r)and GetUnitX(u)<=GetRectMaxX(r)and GetUnitY(u)>=GetRectMinY(r)and GetUnitY(u)<=GetRectMaxY(r)
endfunction
function KA takes string c returns boolean
return( not((c!="1")and(c!="2")and(c!="3")and(c!="4")and(c!="5")and(c!="6")))
endfunction
function lA takes string s returns boolean
local integer LA=1
local string c
if(StringLength(s)>0)then
loop
exitwhen LA>StringLength(s)
set c=SubString(s,LA-1,LA)
if((c!="0")and(c!="1")and(c!="2")and(c!="3")and(c!="4")and(c!="5")and(c!="6")and(c!="7")and(c!="8")and(c!="9"))then
return false
endif
set LA=LA+1
endloop
return true
endif
return false
endfunction
function mA takes nothing returns string
local integer i=R2I(TimerGetElapsed(Qr))
local integer j=ModuloInteger(i,60)
local string s
if(j<10)then
set s="0"+I2S(j)
else
set s=I2S(j)
endif
return"|cffFFFF00"+I2S(i/ 60)+"|cffFF8000:|cffFFFF00"+s+"|r"
endfunction
function MA takes unit u returns nothing
call IssuePointOrderByIdLoc(u,851983,Yx[Fi[(1+GetPlayerId(GetOwningPlayer(u)))]])
endfunction
function pA takes unit u returns nothing
if GetUnitAbilityLevel(u,'A07M')==1 then
set Po=u
call TriggerExecute(sn)
else
call IssuePointOrderByIdLoc(u,851983,Yx[Fi[(1+GetPlayerId(GetOwningPlayer(u)))]])
endif
endfunction
function PA takes nothing returns force
local force f=CreateForce()
call ForceEnumPlayers(f,bv)
return f
endfunction
function qA takes unit u,integer QA,integer sA returns nothing
call UnitAddAbility(u,QA)
call SetUnitAbilityLevel(u,QA,sA)
call UnitRemoveAbility(u,QA)
endfunction
function SA takes nothing returns unit
local group g=CreateGroup()
local unit u
call GroupEnumUnitsInRect(g,bj_mapInitialPlayableArea,nv)
set u=GroupPickRandomUnit(g)
call DestroyGroup(g)
set g=null
return u
endfunction
function tA takes integer yI returns player
local integer i=yI*6
loop
exitwhen i>5+yI*6
if IsPlayerInForce(Player(i),Ba)and not se[i+1]then
return Player(i)
endif
set i=i+1
endloop
return null
endfunction
function TA takes unit uA returns unit
if IsUnitType(uA,UNIT_TYPE_TAUREN)==false then
return uA
endif
return XO[(GetUnitUserData(uA))]
endfunction
function GetRealKillingUnit takes nothing returns unit
return TA(GetKillingUnit())
endfunction
function UA takes unit LR,unit mR returns integer
local integer u=MR()
set XO[u]=mR
set RO[u]=LR
set OO[u]=GetOwningPlayer(mR)
return u
endfunction
function wA takes nothing returns integer
local unit u=CreateUnit(Player(13),'e008',0,0,.0)
local integer d=uR(u,u)
set RO[d]=u
set bO[d]=CreateTimer()
call SaveInteger(o,0,GetHandleId((bO[d])),(d))
call SetUnitUserData(u,d)
call ShowUnit(u,false)
call UnitAddAbility(u,'Amrf')
call UnitAddAbility(u,'Aloc')
call UnitRemoveAbility(u,'Amrf')
return d
endfunction
function WA takes nothing returns nothing
local integer d=(LoadInteger(o,0,GetHandleId((GetExpiredTimer()))))
call UnitRemoveAbility(RO[d],NO[d])
set IO[AO]=d
set AO=AO+1
endfunction
function yA takes unit YA,integer c returns integer
local integer d
local unit zA
if(AO<1)then
set d=wA()
else
set AO=AO-1
set d=IO[AO]
endif
set zA=RO[d]
call UnitAddAbility(zA,GO[c])
set NO[d]=GO[c]
set XO[d]=YA
set OO[d]=GetOwningPlayer(YA)
call SetUnitOwner(zA,OO[d],true)
call TimerStart(bO[d],FO[c],false,function WA)
call SetUnitX(zA,dO[c])
call SetUnitY(zA,DO[c])
return d
endfunction
function ZA takes integer QA,string vN,real eN returns integer
local integer c=KR()
set GO[c]=QA
set gO[c]=OrderId(vN)
set hO[c]='e008'
set FO[c]=eN
return c
endfunction
function xN takes integer JR,unit YA returns nothing
set dO[JR]=GetUnitX(YA)
set DO[JR]=GetUnitY(YA)
call IssueImmediateOrderById(RO[yA(YA,JR)],gO[JR])
endfunction
function oN takes integer JR,unit YA,unit rN returns nothing
set dO[JR]=GetUnitX(rN)
set DO[JR]=GetUnitY(rN)
call IssueImmediateOrderById(RO[yA(YA,JR)],gO[JR])
endfunction
function iN takes integer JR,unit YA,real x,real y returns nothing
set dO[JR]=x
set DO[JR]=y
call IssueImmediateOrderById(RO[yA(YA,JR)],gO[JR])
endfunction
function aN takes integer JR,unit YA,unit rN returns nothing
local player p=GetOwningPlayer(YA)
set dO[JR]=GetUnitX(YA)
set DO[JR]=GetUnitY(YA)
call UnitShareVision(rN,p,true)
call IssueTargetOrderById(RO[yA(YA,JR)],gO[JR],rN)
call UnitShareVision(rN,p,false)
endfunction
function nN takes integer JR,unit YA,unit rN returns nothing
local player p=GetOwningPlayer(YA)
set dO[JR]=GetUnitX(rN)
set DO[JR]=GetUnitY(rN)
call UnitShareVision(rN,p,true)
call IssueTargetOrderById(RO[yA(YA,JR)],gO[JR],rN)
call UnitShareVision(rN,p,false)
endfunction
function VN takes integer JR,unit YA,unit rN returns nothing
set dO[JR]=GetUnitX(rN)
set DO[JR]=GetUnitY(rN)
call IssuePointOrderById(RO[yA(YA,JR)],gO[JR],dO[JR],DO[JR])
endfunction
function EN takes integer JR,unit YA,real XN,real ON returns nothing
set dO[JR]=GetUnitX(YA)
set DO[JR]=GetUnitY(YA)
call IssuePointOrderById(RO[yA(YA,JR)],gO[JR],XN,ON)
endfunction
function RN takes integer JR,unit YA returns nothing
set dO[JR]=GetUnitX(YA)
set DO[JR]=GetUnitY(YA)
call yA(YA,JR)
endfunction
function IN takes integer JR,unit YA,real AN,real NN returns nothing
set dO[JR]=AN
set DO[JR]=NN
call yA(YA,JR)
endfunction
function bN takes nothing returns boolean
set KO=GetFilterUnit()
if true then
call IssueTargetOrderById(RO[yA(HO,jO)],JO,KO)
endif
return false
endfunction
function BN takes nothing returns nothing
set lO=Condition(function bN)
set kO=CreateGroup()
endfunction
function cN takes integer CN,unit mR,unit dN,real DN returns nothing
local location w=GetUnitLoc(dN)
set bj_lastCreatedUnit=CreateUnitAtLoc(GetOwningPlayer(mR),CN,w,bj_UNIT_FACING)
call ShowUnitHide(bj_lastCreatedUnit)
call UnitApplyTimedLifeBJ(DN,'BFig',bj_lastCreatedUnit)
call RemoveLocation(w)
set w=null
endfunction
function fN takes nothing returns nothing
set m[0]=null
set m[0]=null
set M=852024
endfunction
function FN takes nothing returns nothing
if m[Fi[1+GetPlayerId(GetEnumPlayer())]]!=null and(GetUnitCurrentOrder(br[1+GetPlayerId(GetEnumPlayer())])==0 or GetUnitCurrentOrder(br[1+GetPlayerId(GetEnumPlayer())])==M)then
call IssueTargetOrderById(br[1+GetPlayerId(GetEnumPlayer())],852024,m[Fi[1+GetPlayerId(GetEnumPlayer())]])
endif
endfunction
function gN takes integer yI returns nothing
local unit u
loop
set u=hA(nx[yI])
exitwhen u==null
if(IsUnitType(u,UNIT_TYPE_DEAD))then
call GroupRemoveUnit(nx[yI],u)
else
set R=GetUnitState(u,UNIT_STATE_LIFE)/ GetUnitState(u,UNIT_STATE_MAX_LIFE)
if R>=.97 then
call GroupRemoveUnit(nx[yI],u)
else
set m[yI]=u
if ge>=3 then
call BI("Repair target for Team "+I2S(yI)+": attacked building "+GetUnitName(u))
endif
return
endif
endif
endloop
loop
set u=hA(ax[yI])
exitwhen u==null
if(IsUnitType(u,UNIT_TYPE_DEAD))then
call GroupRemoveUnit(ax[yI],u)
else
set R=GetUnitState(u,UNIT_STATE_LIFE)/ GetUnitState(u,UNIT_STATE_MAX_LIFE)
if R>=.4 then
call GroupRemoveUnit(ax[yI],u)
else
set m[yI]=u
if ge>=3 then
call BI("Repair target for Team "+I2S(yI)+": heavily damaged building "+GetUnitName(u))
endif
return
endif
endif
endloop
if GetUnitStatePercent(Rr[yI],UNIT_STATE_LIFE,UNIT_STATE_MAX_LIFE)<99. then
set m[yI]=Rr[yI]
return
endif
loop
set u=hA(ix[yI])
exitwhen u==null
if(IsUnitType(u,UNIT_TYPE_DEAD))then
call GroupRemoveUnit(ix[yI],u)
else
set R=GetUnitState(u,UNIT_STATE_LIFE)/ GetUnitState(u,UNIT_STATE_MAX_LIFE)
if R>=.97 then
call GroupRemoveUnit(ix[yI],u)
else
set m[yI]=u
if ge>=3 then
call BI("Repair target for Team "+I2S(yI)+": damaged building "+GetUnitName(u))
endif
return
endif
endif
endloop
if ge>=3 then
call BI("Repair target for Team "+I2S(yI)+": nothing")
endif
set m[yI]=null
endfunction
function GN takes nothing returns nothing
set q=ZA('A05B',"howlofterror",1.)
call SaveInteger(A,0,('A05C'),((1)))
endfunction
function hN takes nothing returns nothing
set Q=ZA('A0AF',"impale",2.)
call SaveInteger(A,0,('A0AE'),((2)))
endfunction
function HN takes nothing returns nothing
set S=ZA('A086',"deathanddecay",6.)
endfunction
function jN takes nothing returns nothing
call SaveInteger(A,0,('A09N'),((3)))
endfunction
function JN takes unit rN,integer kN,real KN,real lN,real LN returns nothing
local unit e
local integer mN
if GetUnitAbilityLevel(rN,'A07E')==0 then
call UnitAddAbility(rN,'A07E')
endif
set mN=GetUnitUserData(rN)
if mN==0 then
set mN=PR()
call SetUnitUserData(rN,mN)
endif
set e=CreateUnit(GetOwningPlayer(rN),kN,GetUnitX(rN)+lN,GetUnitY(rN)+LN,KN)
call SetUnitPathing(e,false)
call SetUnitX(e,GetUnitX(rN)+lN)
call SetUnitY(e,GetUnitY(rN)+LN)
call SI((mN),sI((e)))
endfunction
function MN takes unit pN returns nothing
local integer i
local integer mN
local integer PN
if GetUnitAbilityLevel(pN,'A07E')==0 then
return
endif
set mN=GetUnitUserData(pN)
if mN==0 then
return
endif
set PN=(PX[(mN)])
loop
exitwhen PN==0
call RemoveUnit((LX[(PN)]))
set PN=KX[PN]
endloop
call TI(mN)
call SetUnitUserData(pN,0)
endfunction
function qN takes unit u returns nothing
if GetUnitTypeId(u)=='h07M' then
call JN(u,'h08N',226.,37.75,-41.5)
elseif GetUnitTypeId(u)=='h04U' then
call JN((u),('h04J'),((191.)*1.),0,0)
elseif GetUnitTypeId(u)=='h07O' then
call JN(u,'h08K',.0,15.,.0)
call JN((u),('h08R'),((.0)*1.),0,0)
elseif GetUnitTypeId(u)=='h05I' then
call JN((u),('h08G'),((.0)*1.),0,0)
elseif GetUnitTypeId(u)=='h04K' then
call JN((u),('h08I'),((.0)*1.),0,0)
elseif GetUnitTypeId(u)=='h088' then
call JN((u),('h08K'),((.0)*1.),0,0)
elseif GetUnitTypeId(u)=='h07I' then
call JN((u),('h08A'),((.0)*1.),0,0)
elseif GetUnitTypeId(u)=='h073' then
call JN(u,'h08O',312.,40.,19.)
call JN(u,'h08N',34.,-37.75,-25.25)
call JN((u),('h08T'),((.0)*1.),0,0)
elseif GetUnitTypeId(u)=='h08P' then
call JN(u,'h08D',116.,-3.,-10.5)
call JN(u,'h08N',323.,20.,5.75)
elseif GetUnitTypeId(u)=='h07H' then
call JN(u,'h08L',32.,12.,-11.5)
elseif GetUnitTypeId(u)=='h08X' then
call JN(u,'h08Z',250.,46.,33.5)
call JN(u,'h090',270.,-17.,18.)
call SetUnitVertexColor(u,255,255,255,0)
elseif GetUnitTypeId(u)=='h069' then
call JN(u,'h09R',300.,3.5,65.25)
call JN(u,'h09R',70.,-16.5,-51.)
call JN(u,'h09N',238.,36.,53.)
call JN(u,'h09O',314.,-38.,-39.5)
elseif GetUnitTypeId(u)=='h09T' then
call JN((u),('h09V'),((270)*1.),0,0)
call JN(u,'h09U',90.,20.,.0)
call JN(u,'h09U',.0,.0,-20.)
call JN(u,'h09U',270.,-20.,.0)
call JN(u,'h09U',180.,.0,20.)
elseif GetUnitTypeId(u)=='h05L' then
call JN((u),('h09K'),((45.)*1.),0,0)
elseif GetUnitTypeId(u)=='h03S' then
call SetUnitVertexColor(u,0,166,255,'s')
endif
endfunction
function QN takes unit u returns nothing
if GetUnitTypeId(u)=='h07L' then
call JN(u,'h08O',318,43.5,-41.75)
call JN(u,'h08N',226,-38.25,40.25)
elseif GetUnitTypeId(u)=='h07N' then
call JN((u),('h08M'),((0)*1.),0,0)
call JN((u),('h08Q'),((0)*1.),0,0)
elseif GetUnitTypeId(u)=='h07D' then
call JN((u),('h08K'),((0)*1.),0,0)
call JN((u),('h08S'),((0)*1.),0,0)
elseif GetUnitTypeId(u)=='h08Y' then
call JN(u,'h08Z',250.,46.,33.5)
call JN(u,'h091',270.,-17.,18.)
call JN(u,'h08Z',350.,-22.,-40.)
call SetUnitVertexColor(u,255,255,255,0)
elseif GetUnitTypeId(u)=='h03G' then
call JN(u,'h094',74.,38.5,28.)
call JN(u,'h093',160.,-42.,-18.75)
call JN(u,'h093',250.,3.75,-55.5)
elseif GetUnitTypeId(u)=='h097' then
call JN(u,'h096',180.,-45.75,21.75)
call JN(u,'h096',110.,9.,-62.5)
elseif GetUnitTypeId(u)=='h09B' then
call JN(u,'h09C',33.,36.25,36.5)
call JN(u,'h09C',13.,21.,-47.5)
call JN(u,'h09C',319.,-46.25,11.75)
elseif GetUnitTypeId(u)=='h09H' then
call JN(u,'h09C',33.,36.25,36.5)
call JN(u,'h09C',13.,21.,-47.5)
call JN(u,'h09C',319.,-46.25,11.75)
call JN(u,'h09E',348.,-6.5,9.)
elseif GetUnitTypeId(u)=='h09I' then
call JN(u,'h09D',225.,35.,-29.75)
call JN(u,'h09D',45.,20.,22.5)
call JN(u,'h09D',225.,-31.,26.25)
call JN(u,'h09G',23.,-25.25,-36.)
elseif GetUnitTypeId(u)=='h09J' then
call JN(u,'h09F',2.,36.25,41.)
call JN(u,'h09F',2.,33.25,-33.5)
call JN(u,'h09F',2.,-46.25,10.75)
call JN(u,'h09A',45.,-5.25,17.)
elseif GetUnitTypeId(u)=='h09L' then
call JN((u),('h09K'),((238.)*1.),0,0)
elseif GetUnitTypeId(u)=='h09P' then
call JN(u,'h09O',279.,-45.5,24.75)
call JN(u,'h09N',300.,31.,-32.25)
elseif GetUnitTypeId(u)=='h09Y' then
call JN((u),('h09Z'),((270.)*1.),0,0)
elseif GetUnitTypeId(u)=='h0A1' then
call SetUnitVertexColor(u,255,255,255,0)
call JN(u,'h0A0',170.,31.25,-43.)
call JN(u,'h0A0',80.,-38.,-40.25)
call JN(u,'h0A0',350.,-30.25,30.)
call JN(u,'h08Z',220.,43.,27.5)
endif
endfunction
function sN takes nothing returns nothing
call SaveInteger(A,0,('A039'),((4)))
endfunction
function SN takes nothing returns nothing
set T=ZA('A03R',"roar",1.)
call SaveInteger(A,0,('A03S'),((5)))
endfunction
function tN takes nothing returns nothing
call SaveInteger(A,0,('A09A'),((6)))
endfunction
function TN takes nothing returns nothing
set W=ZA('A00N',"charm",1.)
call SaveInteger(A,0,('A00O'),((7)))
endfunction
function uN takes nothing returns nothing
call SaveInteger(A,0,('A033'),((8)))
endfunction
function UN takes nothing returns nothing
set Z=ZA('A08W',"bloodlust",1.)
endfunction
function wN takes nothing returns nothing
set vv=ZA('A06D',"",29.)
endfunction
function WN takes nothing returns nothing
set ev=ZA('A08U',"thunderbolt",3.)
call SaveInteger(A,0,('A08V'),((9)))
endfunction
function yN takes nothing returns nothing
set xv=ZA('A07A',"entanglingroots",6.)
call SaveInteger(A,0,('A07P'),((10)))
endfunction
function YN takes nothing returns nothing
set ov=ZA('A09T',"chainlightning",4.)
endfunction
function zN takes nothing returns nothing
set rv=ZA('A01X',"thunderbolt",1.)
call SaveInteger(A,0,('A01W'),((11)))
endfunction
function ZN takes nothing returns nothing
set iv=ZA('A04S',"",20.)
call SaveInteger(A,0,('A04R'),((12)))
endfunction
function vb takes nothing returns nothing
call SaveInteger(A,0,('A004'),((13)))
endfunction
function eb takes nothing returns boolean
return((IsUnitType(GetFilterUnit(),UNIT_TYPE_MECHANICAL)==false)and(IsUnitType(GetFilterUnit(),UNIT_TYPE_DEAD)))and(IsUnitType(GetFilterUnit(),UNIT_TYPE_SAPPER))
endfunction
function xb takes nothing returns boolean
return(IsUnitType(GetFilterUnit(),UNIT_TYPE_MECHANICAL)==false)and(IsUnitType(GetFilterUnit(),UNIT_TYPE_DEAD))and(IsUnitType(GetFilterUnit(),UNIT_TYPE_SAPPER))and((Fi[GetPlayerId(GetOwningPlayer((GetFilterUnit())))+1])==(Fi[GetPlayerId(GetOwningPlayer((av)))+1]))
endfunction
function ob takes nothing returns boolean
return((Fi[GetPlayerId(GetOwningPlayer((GetFilterUnit())))+1])!=(Fi[GetPlayerId(GetOwningPlayer((av)))+1]))and(IsUnitType(GetFilterUnit(),UNIT_TYPE_DEAD)==false)and(IsUnitType(GetFilterUnit(),UNIT_TYPE_SAPPER)or IsUnitType(GetFilterUnit(),UNIT_TYPE_STRUCTURE))
endfunction
function rb takes nothing returns boolean
return((Fi[GetPlayerId(GetOwningPlayer((GetFilterUnit())))+1])!=(Fi[GetPlayerId(GetOwningPlayer((av)))+1]))and(IsUnitType(GetFilterUnit(),UNIT_TYPE_DEAD)==false)and IsUnitType(GetFilterUnit(),UNIT_TYPE_SAPPER)
endfunction
function ib takes nothing returns boolean
return((Fi[GetPlayerId(GetOwningPlayer((GetFilterUnit())))+1])!=(Fi[GetPlayerId(GetOwningPlayer((av)))+1]))and(IsUnitType(GetFilterUnit(),UNIT_TYPE_DEAD)==false)and(IsUnitType(GetFilterUnit(),UNIT_TYPE_SAPPER))and(IsUnitType(GetFilterUnit(),UNIT_TYPE_FLYING))
endfunction
function ab takes nothing returns boolean
return((Fi[GetPlayerId(GetOwningPlayer((GetFilterUnit())))+1])!=(Fi[GetPlayerId(GetOwningPlayer((av)))+1]))and(IsUnitType(GetFilterUnit(),UNIT_TYPE_DEAD)==false)and(IsUnitType(GetFilterUnit(),UNIT_TYPE_SAPPER))and(IsUnitType(GetFilterUnit(),UNIT_TYPE_FLYING))and(IsUnitType(GetFilterUnit(),UNIT_TYPE_MECHANICAL)==false)
endfunction
function nb takes nothing returns boolean
return(IsPlayerInForce(GetFilterPlayer(),Ba)and not se[GetPlayerId(GetFilterPlayer())+1])
endfunction
function Vb takes nothing returns boolean
return( not(IsUnitType(GetFilterUnit(),UNIT_TYPE_FLYING)))and( not(GetPlayerId(GetOwningPlayer(GetFilterUnit()))>11))and( not(GetUnitPointValue(GetFilterUnit())==129))and( not(IsUnitType(GetFilterUnit(),UNIT_TYPE_DEAD)))and( not(GetUnitTypeId(GetFilterUnit())=='n026'))
endfunction
function Eb takes nothing returns boolean
return GetUnitTypeId(GetEventDamageSource())=='h04X'
endfunction
function Xb takes nothing returns boolean
return(IsUnitType(GetFilterUnit(),UNIT_TYPE_STRUCTURE)!=null)
endfunction
function Ob takes nothing returns nothing
set nv=Condition(function eb)
set Vv=Condition(function xb)
set Ev=Condition(function ob)
set Xv=Condition(function ib)
set Rv=Condition(function rb)
set Av=Condition(function Eb)
set Nv=Condition(function Vb)
set bv=Condition(function nb)
set Iv=Condition(function Xb)
set Ov=Condition(function ab)
endfunction
function Rb takes string Ib,unit uA,integer Ab,integer Nb,integer bb,real Bb,real cb,real Cb returns texttag
local real lN=-I2R(StringLength(Ib))*6
set bj_lastCreatedTextTag=CreateTextTag()
call SetTextTagText(bj_lastCreatedTextTag,Ib,.024)
call SetTextTagPos(bj_lastCreatedTextTag,lN+GetUnitX(uA),GetUnitY(uA)-16,0)
call SetTextTagColor(bj_lastCreatedTextTag,Ab,Nb,bb,255)
call SetTextTagPermanent(bj_lastCreatedTextTag,false)
call SetTextTagLifespan(bj_lastCreatedTextTag,cb)
call SetTextTagFadepoint(bj_lastCreatedTextTag,Bb)
call SetTextTagVelocity(bj_lastCreatedTextTag,0,Cb)
return bj_lastCreatedTextTag
endfunction
function db takes player p,string Ib,unit uA,integer Ab,integer Nb,integer bb,real Bb,real cb,real Cb returns texttag
call Rb(Ib,uA,Ab,Nb,bb,Bb,cb,Cb)
if GetLocalPlayer()!=p then
call SetTextTagVisibility(bj_lastCreatedTextTag,false)
endif
return bj_lastCreatedTextTag
endfunction
function Db takes unit u,integer fb returns nothing
if Pi>0 and(C[Mr*12*1+GetPlayerId((GetOwningPlayer(u)))*1+(0)])+fb>Pi then
set fb=Pi-R2I((C[Mr*12*1+GetPlayerId((GetOwningPlayer(u)))*1+(0)]))
endif
call cA(GetOwningPlayer(u),0,fb)
call AdjustPlayerStateBJ(fb,GetOwningPlayer(u),PLAYER_STATE_RESOURCE_LUMBER)
call db(GetOwningPlayer(u),I2S(fb),u,0,170,0,1.,3.,.06)
endfunction
function Fb takes nothing returns nothing
call SaveInteger(A,0,('A04U'),((14)))
endfunction
function gb takes nothing returns nothing
call SaveInteger(A,0,('A04J'),((15)))
endfunction
function Gb takes nothing returns nothing
set Bv=ZA('A016',"bloodlust",1.)
call SaveInteger(A,0,('A01K'),((16)))
endfunction
function hb takes nothing returns nothing
call SaveInteger(A,0,('A04L'),((17)))
endfunction
function Hb takes nothing returns nothing
set cv=ZA('A09E',"thunderclap",3.)
call SaveInteger(A,0,('A09D'),((18)))
endfunction
function jb takes nothing returns nothing
set Cv=ZA('A018',"hex",1.)
call SaveInteger(A,0,('A017'),((19)))
endfunction
function Jb takes nothing returns nothing
set dv=ZA('A043',"frostnova",1.)
call SaveInteger(A,0,('A044'),((20)))
endfunction
function kb takes multiboard Kb,integer x,integer y,string lb returns nothing
set H=MultiboardGetItem(Kb,y,x)
call MultiboardSetItemValue(H,lb)
call MultiboardReleaseItem(H)
endfunction
function UpdateRoundTime takes nothing returns nothing
call kb(ar,5,3,mA())
endfunction
function Lb takes nothing returns nothing
set Dv=ZA('A018',"hex",1.)
set fv=ZA('A06S',"thunderbolt",2.)
call SaveInteger(A,0,('A06R'),((21)))
endfunction
function mb takes nothing returns nothing
set Fv=ZA('A05D',"stomp",1.)
call SaveInteger(A,0,('A05E'),((22)))
endfunction
function Mb takes nothing returns nothing
call SaveInteger(A,0,('A095'),((23)))
endfunction
function pb takes nothing returns nothing
local integer Pb=0
local integer qb=0
if io!=0 then
if(GetPlayerId(GetOwningPlayer(Va[0]))==0)then
set Pb=1
elseif(GetPlayerId(GetOwningPlayer(Va[0]))==6)then
set qb=1
endif
endif
if io!=1 then
if(GetPlayerId(GetOwningPlayer(Va[1]))==0)then
set Pb=Pb+1
elseif(GetPlayerId(GetOwningPlayer(Va[1]))==6)then
set qb=qb+1
endif
endif
if io!=-1 then
set Pb=Pb+1
set qb=qb+1
endif
if(Pb==2)then
set jo[0]=1.+hi
call DisplayTimedTextToForce(Ba,8,Ji[0]+"|cffFFFF00 доминируют, они получают +"+I2S(R2I(hi*'d'))+"% дохода!|r")
set qo[0]=true
else
if qo[0]then
call DisplayTimedTextToForce(Ba,8,Ji[0]+"|cffFFFF00 больше не доминируют!|r")
endif
set qo[0]=false
set jo[0]=1.
endif
if(qb==2)then
set jo[1]=1.+hi
call DisplayTimedTextToForce(Ba,8,Ji[1]+"|cffFFFF00 доминируют, они получают +"+I2S(R2I(hi*'d'))+"% дохода!|r")
set qo[1]=true
else
if qo[1]then
call DisplayTimedTextToForce(Ba,8,Ji[1]+"|cffFFFF00 больше не доминируют!|r")
endif
set qo[1]=false
set jo[1]=1.
endif
endfunction
function Qb takes integer i,unit sb returns nothing
local group g
local integer Pb=0
local integer qb=0
local unit u
if io==i then
return
endif
set g=CreateGroup()
call GroupEnumUnitsInRect(g,Ei[i],Nv)
call GroupAddUnit(g,sb)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if(GetPlayerId(GetOwningPlayer(u))<=5)then
set Pb=Pb+1
else
set qb=qb+1
endif
endloop
call DestroyGroup(g)
set g=null
if(Pb>0 and qb==0)and GetPlayerId(GetOwningPlayer(Va[i]))!=0 then
call SetUnitOwner(Va[i],Player(0),true)
call pb()
elseif(Pb==0 and qb>0)and GetPlayerId(GetOwningPlayer(Va[i]))!=6 then
call SetUnitOwner(Va[i],Player(6),true)
call pb()
endif
endfunction
function Sb takes nothing returns nothing
local integer tb=CountPlayersInForceBJ(er)
if tb==0 then
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"Все игроки согласились, количесвто раундов увеличивается на "+I2S(oo))
call DisableTrigger(vE)
call PauseTimer(Li)
call DestroyForce(er)
set Wx=Wx+oo
set go=true
call TriggerExecute(In)
endif
endfunction
function Tb takes nothing returns nothing
local player p
local integer ub=wi*2
local integer yI=qi
local integer i
local unit Ub
loop
exitwhen ub==0
set p=tA(yI)
if(p!=null)then
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,Lr[(1+GetPlayerId(p))]+" должен забанить расу в течении 15 секунд!")
call zI(p,'h09W')
set Ub=bj_lastCreatedUnit
else
set i=vA(Player(0))
call WI(i,-1)
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,Ji[yI]+" забанил |cffFFFF00"+Go[i]+"|r")
endif
set i=0
loop
if i>=15 then
set i=vA(Player(0))
call WI(i,-1)
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,Lr[(1+GetPlayerId(p))]+" забанил наугад |cffFFFF00"+Go[i]+"|r")
call RemoveUnit(Ub)
exitwhen true
endif
call TriggerSleepAction(1.)
exitwhen CountUnitsInGroup(Do[yI])==0
set i=i+1
endloop
call TriggerSleepAction(3.)
set yI=ModuloInteger(yI+1,2)
set ub=ub-1
endloop
endfunction
function wb takes nothing returns nothing
if not se[(1+GetPlayerId(GetEnumPlayer()))]then
call zI(GetEnumPlayer(),'h033')
else
call rA(GetEnumPlayer())
endif
endfunction
function Wb takes nothing returns nothing
local integer i=rA(GetOwningPlayer(GetEnumUnit()))
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,Lr[(1+GetPlayerId(GetOwningPlayer(GetEnumUnit())))]+" выбрал наугад |cffFFFF00"+Go[i]+"|r")
call RemoveUnit(GetEnumUnit())
endfunction
function yb takes force f,integer yI returns nothing
local integer i=0
if CountPlayersInForceBJ(f)==0 then
return
endif
loop
exitwhen i>11
if IsPlayerInForce(Player(i),f)then
call DisplayTextToPlayer(Player(i),0,0,"|cffFFFF00У вас есть 15 секунд, чтобы выбрать вашу расу!|r")
endif
set i=i+1
endloop
call ForForce(f,function wb)
set i=0
loop
if i>=15 then
call ForGroup(Do[yI],function Wb)
exitwhen true
endif
call TriggerSleepAction(1.)
exitwhen CountUnitsInGroup(Do[yI])==0
set i=i+1
endloop
call TriggerSleepAction(3.)
call ForceClear(f)
endfunction
function Yb takes integer zb returns integer
local integer Zb=(zb/ 6)*6+5
if zb==-1 then
return-1
endif
loop
exitwhen zb>Zb
if IsPlayerInForce(Player(zb),Ba)then
return zb
endif
set zb=zb+1
endloop
return-1
endfunction
function vB takes nothing returns nothing
local integer yI=qi
local integer array zb
local force eB=CreateForce()
set zb[0]=0
set zb[1]=6
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"")
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"

|cffFFFF00----------- Приготовтесь к призыву! -----------|r")
call TriggerSleepAction(5.)
set zb[yI]=Yb(zb[yI])
call ForceAddPlayer(eB,Player(zb[yI]))
set zb[yI]=zb[yI]+1
call yb(eB,yI)
loop
set yI=ModuloInteger(yI+1,2)
set zb[yI]=Yb(zb[yI])
if(zb[yI]!=-1)then
call ForceAddPlayer(eB,Player(zb[yI]))
set zb[yI]=zb[yI]+1
set zb[yI]=Yb(zb[yI])
if(zb[yI]!=-1)then
call ForceAddPlayer(eB,Player(zb[yI]))
set zb[yI]=zb[yI]+1
endif
endif
call yb(eB,yI)
exitwhen zb[0]==-1 and zb[1]==-1
endloop
endfunction
function xB takes nothing returns nothing
set gv=ZA('A02T',"purge",2.)
call SaveInteger(A,0,('A02U'),((24)))
endfunction
function oB takes nothing returns nothing
call SaveInteger(A,0,('A072'),((25)))
endfunction
function rB takes nothing returns nothing
call SaveInteger(A,0,('A08E'),((26)))
endfunction
function iB takes nothing returns nothing
call SaveInteger(A,0,('A03K'),((27)))
endfunction
function aB takes nothing returns nothing
call SaveInteger(A,0,('A03I'),((28)))
endfunction
function nB takes nothing returns nothing
set Gv=ZA('A00B',"thunderclap",1.)
call SaveInteger(A,0,('A00M'),((29)))
endfunction
function VB takes nothing returns nothing
set hv=ZA('A06C',"",29.)
endfunction
function EB takes nothing returns nothing
call SaveInteger(A,0,('A09O'),((30)))
endfunction
function XB takes string OB,unit RB returns nothing
local location l=GetUnitLoc(RB)
local effect e=AddSpecialEffectLoc(OB,l)
call RemoveLocation(l)
call DestroyEffect(e)
set e=null
set l=null
endfunction
function IB takes string OB,unit RB,string dN returns nothing
local effect e=AddSpecialEffectTarget(OB,RB,dN)
call DestroyEffect(e)
set e=null
endfunction
function AB takes nothing returns nothing
set Hv=ZA('A07Q',"entanglingroots",11.)
call SaveInteger(A,0,('A07R'),((31)))
endfunction
function NB takes nothing returns nothing
set jv=ZA('A02G',"",1.)
set gO[(jv)]=(852269)
endfunction
function bB takes nothing returns nothing
set Jv=ZA('A030',"acidbomb",30.)
call SaveInteger(A,0,('A02Z'),((32)))
endfunction
function BB takes nothing returns nothing
call SaveInteger(A,0,('A01E'),((33)))
endfunction
function cB takes nothing returns nothing
set kv=ZA('A0AK',"thunderbolt",10.)
call SaveInteger(A,0,('A06P'),((34)))
endfunction
function CB takes nothing returns nothing
set Kv=ZA('A08A',"",1.)
set gO[(Kv)]=(852269)
endfunction
function dB takes nothing returns nothing
call SaveInteger(A,0,('A08B'),((35)))
endfunction
function DB takes nothing returns nothing
set lv=ZA('A0A8',"healingwave",2.)
call SaveInteger(A,0,('A0A7'),((36)))
endfunction
function fB takes unit u returns nothing
local integer sA=GetUnitAbilityLevel(u,'A09C')+1
if(sA>=6)then
return
endif
call SetUnitAbilityLevel(u,'A09C',sA)
call SetUnitAbilityLevel(u,'A09B',sA)
call IB("Abilities\\Spells\\Human\\Avatar\\AvatarCaster.mdl",u,"origin")
if sA==2 then
call AddSpecialEffectTarget("Abilities\\Spells\\Orc\\Bloodlust\\BloodlustTarget.mdl",u,"weapon,right")
elseif sA==3 then
call AddSpecialEffectTarget("Abilities\\Spells\\Orc\\TrollBerserk\\HeadhunterWEAPONSLeft.mdl",u,"head")
elseif sA==4 then
call AddSpecialEffectTarget("Abilities\\Spells\\Orc\\Bloodlust\\BloodlustTarget.mdl",u,"head")
elseif sA==5 then
call AddSpecialEffectTarget("Abilities\\Weapons\\PhoenixMissile\\Phoenix_Missile.mdl",u,"weapon,right")
endif
endfunction
function FB takes unit u returns nothing
local integer sA=GetUnitAbilityLevel(u,'A09L')
if sA==2 then
call SetUnitAbilityLevel(u,'A09L',1)
call SetUnitState(u,UNIT_STATE_LIFE,GetUnitState(u,UNIT_STATE_LIFE)+200)
call SetUnitState(u,UNIT_STATE_MANA,GetUnitState(u,UNIT_STATE_MANA)+'d')
call qA(u,'A09M',3)
elseif sA==1 then
call UnitRemoveAbility(u,'A09L')
endif
call IB("Abilities\\Spells\\Items\\AIvi\\AIviTarget.mdl",u,"origin")
endfunction
function gB takes unit GB,unit hB returns boolean
if GetUnitTypeId(GB)=='n01T' then
call fB(GB)
if GetRandomInt(0,99)<60 then
return false
endif
endif
if GetUnitAbilityLevel(GB,'A09L')>0 then
call FB(GB)
return false
endif
if GetUnitAbilityLevel(GB,'A070')!=0 then
return false
endif
return true
endfunction
function HB takes unit GB,unit hB returns boolean
if not gB(GB,hB)then
call IB("Abilities\\Spells\\Human\\DispelMagic\\DispelMagicTarget.mdl",GB,"origin")
return false
endif
return true
endfunction
function jB takes nothing returns nothing
set Lv=ZA('A07T',"starfall",11.)
set mv=ZA('A08T',"starfall",11.)
call SaveInteger(A,0,('A07U'),((37)))
endfunction
function JB takes nothing returns nothing
set Mv=ZA('A031',"stomp",1.)
call SaveInteger(A,0,('A032'),((38)))
endfunction
function kB takes nothing returns nothing
set pv=ZA('A06H',"ensnare",2.)
call SaveInteger(A,0,('A06I'),((39)))
endfunction
// лимит юнитов на игрока: считаем всех юнитов, кроме зданий и строителя (CF_UC), раз в секунду пересчёт, новые бойцы сверх лимита не появляются
function CF_Cap takes unit u returns boolean
local integer p=GetPlayerId(GetOwningPlayer(u))
if p>11 or IsUnitType(u,UNIT_TYPE_STRUCTURE) or GetUnitAbilityLevel(u,'Cf01')>0 then
return false
endif
if CF_UC[p]>=CF_UCap then
if not CF_Lim[p] then
set CF_Lim[p]=true
call DisplayTimedTextToPlayer(Player(p),0,0,8.,"|cffFF0000Лимит: "+I2S(CF_UCap)+" юнитов на игрока. Новые бойцы не появляются, пока часть не погибнет.|r")
endif
return true
endif
set CF_UC[p]=CF_UC[p]+1
return false
endfunction
function CF_Recount takes nothing returns nothing
local group g=CreateGroup()
local rect r=GetWorldBounds()
local unit u
local integer p=0
loop
exitwhen p>11
set CF_UC[p]=0
set p=p+1
endloop
call GroupEnumUnitsInRect(g,r,null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
set p=GetPlayerId(GetOwningPlayer(u))
if p<=11 and GetWidgetLife(u)>.405 and not IsUnitType(u,UNIT_TYPE_STRUCTURE) then
set CF_UC[p]=CF_UC[p]+1
endif
endloop
set p=0
loop
exitwhen p>11
if CF_UC[p]<CF_UCap then
set CF_Lim[p]=false
endif
set p=p+1
endloop
call RemoveRect(r)
call DestroyGroup(g)
set g=null
set r=null
endfunction
// бонус кузницы новому бойцу: свой уровень + половина лучшего союзника (его уровни 3-5)
function CF_Up takes unit u returns nothing
local integer p=GetPlayerId(GetOwningPlayer(u))
local integer cf_q=0
local integer cf_a=0
local integer cf_d=0
local integer cf_v
if p<0 or p>11 or IsUnitType(u,UNIT_TYPE_STRUCTURE)then
return
endif
loop
exitwhen cf_q>11
if cf_q!=p and Fi[cf_q+1]==Fi[p+1]and GetPlayerSlotState(Player(cf_q))==PLAYER_SLOT_STATE_PLAYING then
if CF_FA[cf_q]-2>cf_a then
set cf_a=CF_FA[cf_q]-2
endif
if CF_FD[cf_q]-2>cf_d then
set cf_d=CF_FD[cf_q]-2
endif
endif
set cf_q=cf_q+1
endloop
// атака: шаги по 4% (свой уровень = 2 шага, уровень союзника сверх 2-го = 1 шаг)
set cf_a=2*CF_FA[p]+cf_a
// командир Дима: +24% к урону (6 ступеней по 4%)
if CF_Cmd[p]==3 then
set cf_a=cf_a+6
endif
// сила ботов из меню: ступени по 4% урона (15% = 4, 30% = 8, 80% = 20), только ботам
if se[p+1] and CF_BD>0 then
set cf_a=cf_a+(CF_BD+2)/4
endif
if cf_a>0 then
set cf_v=LoadInteger(CF_HD,0,GetUnitTypeId(u))
if cf_v<=0 then
set cf_v=30
endif
set cf_v=R2I(I2R(cf_v)*.04*I2R(cf_a)+.5)
if cf_v<1 then
set cf_v=1
elseif cf_v>169 then
set cf_v=169
endif
call UnitAddAbility(u,CF_QA[cf_v])
endif
// броня: свой уровень + половина союзника (округление вверх)
set cf_d=CF_FD[p]+(cf_d+1)/2
if cf_d==6 then
call UnitAddAbility(u,'AId5')
call UnitAddAbility(u,'AId1')
elseif cf_d>0 then
call UnitAddAbility(u,CF_ID[cf_d])
endif
// командир Дэн: +24% скорости атаки (одна общая способность Cc01)
if CF_Cmd[p]==4 then
call UnitAddAbility(u,'Cc01')
endif
// командир Леша: 20% шанс уклониться (Cc02); командир Юра: 25% шанс критического удара x2 (Cc03)
if CF_Cmd[p]==6 then
call UnitAddAbility(u,'Cc02')
elseif CF_Cmd[p]==5 then
call UnitAddAbility(u,'Cc03')
endif

endfunction
function KB takes unit u returns nothing
local integer yI
if u==null then
return
endif
if CF_Cap(u) then
call RemoveUnit(u)
return
endif
call CF_Up(u)
set yI=(Fi[GetPlayerId(GetOwningPlayer((u)))+1])
call iA(xO[yI],u)
if IsUnitType(u,UNIT_TYPE_FLYING)then
call iA(rO[yI],u)
call UnitAddAbility(u,'A07F')
else
call iA(iO[yI],u)
endif
endfunction
function lB takes unit u,integer yI returns nothing
if u==null then
return
endif
call VA(xO[yI],u)
if GetUnitAbilityLevel(u,'A07F')==1 then
call VA(rO[yI],u)
else
call VA(iO[yI],u)
endif
endfunction
function LB takes unit u returns nothing
call lB(u,(Fi[GetPlayerId(GetOwningPlayer((u)))+1]))
endfunction
function mB takes nothing returns nothing
set Pv=ZA('A01I',"flamestrike",6.)
set qv=ZA('A05H',"flamestrike",6.)
call SaveInteger(A,0,('A01J'),((40)))
endfunction
function MB takes nothing returns nothing
set Qv=ZA('A00I',"fanofknives",1.)
call SaveInteger(A,0,('A00K'),((41)))
endfunction
function pB takes nothing returns nothing
call SaveInteger(A,0,('A057'),((42)))
endfunction
function PB takes nothing returns nothing
set sv=ZA('A00Y',"healingwave",2.)
call SaveInteger(A,0,('A00X'),((43)))
endfunction
function qB takes nothing returns nothing
set Sv=ZA('A082',"thunderbolt",2.)
set tv=ZA('A083',"thunderbolt",2.)
set Tv=ZA('A04H',"entanglingroots",16.)
endfunction
function QB takes nothing returns nothing
call SaveInteger(A,0,('A04I'),((44)))
endfunction
function sB takes integer SB returns nothing
local string tB=""
if(ModuloInteger((SB),2))==1 then
set tB="нижней"
else
set tB="верхней"
endif
call DisplayTextToForce(cR(Player(SB-1)),Lr[SB]+": Я буду строить на "+tB+" линии!")
call PingMinimapLocForForce(cR(Player(SB-1)),GetRectCenter(Ox[(ModuloInteger((SB),2))]),3)
endfunction
function TB takes unit uB returns nothing
local integer UB=GetUnitPointValue(uB)
local integer wB=xo[UB]
local integer WB=vo[UB]
local integer yB=Fx[UB]
local integer flyingClass=0
local integer yI=(Fi[GetPlayerId(GetOwningPlayer((uB)))+1])
local integer YB=yI*2
if gi[UB]>=2 then
return
endif
if not RectContainsCoords(We[yI*2],GetUnitX(uB),GetUnitY(uB))then
set YB=YB+1
endif
if IsUnitIdType(lx[UB],UNIT_TYPE_FLYING) then
set ye[wB*4+YB]=ye[wB*4+YB]+yB
set ze[YB]=ze[YB]+yB
else
set Ye[wB*4+YB]=Ye[wB*4+YB]+yB
set Ze[YB]=Ze[YB]+yB
endif
if ho[UB]==1 or ho[UB]==3 then
set vx[WB*4+YB]=vx[WB*4+YB]+yB
set xx[YB]=xx[YB]+yB
endif
if ho[UB]==2 or ho[UB]==3 then
set ex[WB*4+YB]=ex[WB*4+YB]+yB
set ox[YB]=ox[YB]+yB
endif
if ho[UB]==3 then
set rx[YB]=rx[YB]+yB
endif
endfunction
function zB takes integer yI returns nothing
if TimerGetRemaining(te[yI])<=.0 then
call TimerStart(te[yI],20,false,null)
set Se[yI]=true
endif
endfunction
function ZB takes nothing returns nothing
if(GetUnitTypeId(GetEnumUnit())=='h033')then
call rA(GetOwningPlayer(GetEnumUnit()))
call RemoveUnit(GetEnumUnit())
endif
endfunction
function vc takes integer zR returns nothing
call eR(15)
call ForGroupBJ(NR(Player(zR)),function ZB)
endfunction
function ec takes nothing returns nothing
if fe then
return
endif
set fe=true
call EnableTrigger(AE)
endfunction
function xc takes boolean oc returns nothing
if oc then
if ForcePickRandomPlayer(Me)!=null then
call EnableTrigger(nE)
if not to then
call EnableTrigger(VE)
endif
endif
set Fe=true
else
call DisableTrigger(nE)
call DisableTrigger(VE)
set Fe=false
endif
endfunction
function rc takes integer SB returns nothing
local integer i
set se[SB]=true
call ForceAddPlayer(Me,Player(SB-1))
call ec()
if Fe then
call xc(true)
endif
set Pe[SB]=0
call sB(SB)
set i=0
loop
exitwhen i>2
set Rx[SB*3+i]=0
set i=i+1
endloop
set Vx[SB]=0
set ke[SB]=-1
set Ke[SB]=-1
set KE=0
set He[SB]=0
set je[SB]=0
set le[SB]=true
set Je[SB]=0
set Le[SB]=false
endfunction
function ic takes nothing returns nothing
call rc((1+GetPlayerId(GetEnumPlayer())))
endfunction
function ac takes nothing returns nothing
local integer i
if ForcePickRandomPlayer(Me)==null then
return
endif
call ec()
set Se[0]=false
set Se[1]=false
call ForForce(Me,function ic)
set i=0
loop
exitwhen i>3
set ze[i]=0
set Ze[i]=0
set xx[i]=0
set ox[i]=0
set rx[i]=0
set i=i+1
endloop
set i=0
loop
exitwhen i>40
set ye[i]=0
set Ye[i]=0
set vx[i]=0
set ex[i]=0
set i=i+1
endloop
set cx=true
set Bx=CreateTimer()
call TimerStart(Bx,25,false,null)
call TimerStart(te[0],1,false,null)
call TimerStart(te[1],1,false,null)
endfunction
function nc takes nothing returns nothing
if GetOwningPlayer(GetEnumUnit())!=Player(15)and GetUnitTypeId(GetEnumUnit())!='h00L' then
call MN(GetEnumUnit())
call RemoveUnit(GetEnumUnit())
endif
endfunction
function Vc takes integer Ec,unit RB,unit Xc,player mR returns nothing
local location dN=GetUnitLoc(RB)
local integer i=Fi[(1+GetPlayerId(mR))]
set bj_lastCreatedUnit=CreateUnitAtLoc(mR,Ec,dN,GetUnitFacing(RB))
call RemoveLocation(dN)
set dN=null
call pA(bj_lastCreatedUnit)
set Br[i]=(Br[i]+1)
call KB(bj_lastCreatedUnit)
endfunction
function Oc takes unit uB,unit u returns nothing
if(uB==null)then
return
endif
if(GetUnitAbilityLevel(uB,'B01K')>0)then
call qA(u,'A09M',3)
call UnitAddAbility(u,'A09Q')
call UnitAddAbility(u,'A09R')
endif
endfunction
function Rc takes unit u returns boolean
return(GetUnitTypeId(u)=='n003')or(GetUnitTypeId(u)=='n00I')or(GetUnitTypeId(u)=='n00J')or(GetUnitTypeId(u)=='n00K')
endfunction
function Ic takes unit uB,unit u returns nothing
local integer i
if(Rc(u))then
call Vc(GetUnitTypeId(u),u,uB,GetOwningPlayer(u))
call Oc(uB,bj_lastCreatedUnit)
elseif(GetUnitPointValue(u)=='e')then
call LB(u)
set i=GetRandomInt(0,99)
if(i<5)then
call ReplaceUnitBJ(u,'n00M',1)
elseif(i<14)then
call ReplaceUnitBJ(u,'n00R',1)
else
set i=GetRandomInt(0,3)
if(i==0)then
call ReplaceUnitBJ(u,'n00Q',1)
elseif(i==1)then
call ReplaceUnitBJ(u,'n00N',1)
elseif(i==2)then
call ReplaceUnitBJ(u,'n00O',1)
else
call ReplaceUnitBJ(u,'n00P',1)
endif
endif
set u=bj_lastReplacedUnit
call KB(u)
call pA(u)
call Oc(uB,u)
set i=GetRandomInt(0,99)
if(i<20)then
call UnitAddAbility(u,'A009')
elseif(i<55)then
call UnitAddAbility(u,'A01F')
endif
set i=GetRandomInt(0,99)
if(i<18)then
call UnitAddAbility(u,'A02B')
elseif(i<30)then
call UnitAddAbility(u,'A01B')
elseif(i<33)then
call UnitAddAbility(u,'A00Z')
elseif(i<43)then
call UnitAddAbility(u,'A07L')
endif
set i=GetRandomInt(0,99)
if(i<10)then
call UnitAddAbility(u,'A00U')
elseif(i<32)then
call UnitAddAbility(u,'A00T')
elseif(i<35)then
call UnitAddAbility(u,'A05J')
endif
set i=GetRandomInt(0,99)
if(i<25)then
call UnitAddAbility(u,'A01A')
endif
set i=GetRandomInt(0,99)
if(i<15)then
call UnitAddAbility(u,'A00V')
elseif(i<40)then
call UnitAddAbility(u,'A00D')
endif
set i=GetRandomInt(0,99)
if(i<8)then
call UnitAddAbility(u,'A01U')
elseif(i<16)then
call UnitAddAbility(u,'A010')
elseif(i<24)then
call UnitAddAbility(u,'A01P')
elseif(i<34)then
call UnitAddAbility(u,'A006')
elseif(i<44)then
call UnitAddAbility(u,'A01R')
elseif(i<47)then
call UnitAddAbility(u,'A012')
endif
elseif GetUnitTypeId(u)=='n01U' then
call UnitApplyTimedLife(u,'BTLF','x')
set L=GetUnitRallyPoint(uB)
if(L!=null)then
call StoreReal(vr,"repairgobboX",(I2S(GetHandleId((u)))),GetLocationX(L))
call StoreReal(vr,"repairgobboY",(I2S(GetHandleId((u)))),GetLocationY(L))
call RemoveLocation(L)
set L=null
endif
call LB(u)
elseif GetUnitTypeId(u)=='h06U' then
call SetUnitState(u,UNIT_STATE_MANA,GetRandomReal(0,50))
endif
endfunction
function Ac takes integer Ec,unit RB,unit Xc,player mR returns nothing
local location dN=GetUnitLoc(RB)
local integer i=Fi[(1+GetPlayerId(mR))]
set bj_lastCreatedUnit=CreateUnitAtLoc(mR,Ec,dN,GetUnitFacing(RB))
call RemoveLocation(dN)
set dN=null
call pA(bj_lastCreatedUnit)
set Br[i]=(Br[i]+1)
call KB(bj_lastCreatedUnit)
if(GetUnitAbilityLevelSwapped('A07J',bj_lastCreatedUnit)==1)then
set Po=bj_lastCreatedUnit
call Ic(Xc,bj_lastCreatedUnit)
endif
endfunction
function Nc takes player p,integer sA returns nothing
local unit bc=CreateUnitAtLoc(p,'tec0'+sA,wv,.0)
call ShowUnit(bc,false)
call GroupAddUnit(Uv,bc)
endfunction
function Bc takes nothing returns nothing
local integer i=0
local integer j
local player p
local unit u
set wv=GetRectCenter(Za)
set Uv=CreateGroup()
loop
exitwhen i>11
set j=1
set p=Player(i)
loop
exitwhen j>3
set u=CreateUnitAtLoc(p,'tec0'+j,wv,.0)
call ShowUnit(u,false)
call GroupAddUnit(Uv,u)
set j=j+1
endloop
set i=i+1
endloop
endfunction
function cc takes nothing returns nothing
call RemoveUnit(GetEnumUnit())
endfunction
function Cc takes nothing returns nothing
call ForGroup(Uv,function cc)
call GroupClear(Uv)
endfunction
function dc takes nothing returns nothing
set De[0]=3
set De[1]=1
set De[2]=0
set De[3]=0
set De[4]=0
set De[5]=0
set De[6]=0
set Ee[0]=0
set Ee[1]=1
set Ee[2]=2
set Ee[3]=99
set Ee[4]=4
set Re[0]=2
set Re[1]=0
set Re[2]=1
set Re[3]=99
set Re[4]=99
set Xe[0]=1
set Xe[1]=2
set Xe[2]=0
set Xe[3]=99
set Xe[4]=99
set Xe[7]=99
set Oe[0]=0
set Oe[1]=1
set Oe[2]=2
set Oe[3]=99
set Oe[4]=4
set Oe[7]=99
set Ix[0]=7.
set Ax[0]=0
set Nx[0]=285
set bx[0]=285
set Ix[1]=15.
set Ax[1]=0
set Nx[1]=285
set bx[1]=450
set Ix[2]=27.
set Ax[2]=165
set Nx[2]=350
set bx[2]=650
set Ix[3]=65.
set Ax[3]=165
set Nx[3]=550
set bx[3]=5000
set Ix[4]=100000.
set Ax[4]=200
set Nx[4]=5000
set bx[4]=5000
endfunction
function Dc takes integer SB,integer II,integer fc returns integer
local integer Fc=GetUnitPointValueByType(II)
local integer gc=5000
set I=GetRandomInt(0,Wv)
set gc=gc+I
if ge>=3 then
call BI("+"+I2S(I)+" random bonus")
endif
set gc=gc+fc/ IntegerTertiaryOp(Pe[SB]!=CF_PeN[SB],4,ie)-LoadInteger(CF_HD,30+SB,II)*60
if ge>=3 then
call BI("+"+I2S(fc/ ie)+" for its price")
endif
return gc
endfunction
function Gc takes integer SB,integer II,integer fc returns integer
local integer Fc=GetUnitPointValueByType(II)
local integer gc=5000
set I=GetRandomInt(0,Wv)
set gc=gc+I
if ge>=3 then
call BI("+"+I2S(I)+" random bonus")
endif
set gc=gc+fc/ IntegerTertiaryOp(Pe[SB]!=CF_PeN[SB],4,ie)-LoadInteger(CF_HD,30+SB,II)*60
if ge>=3 then
call BI("+"+I2S(fc/ ie)+" for its price")
endif
if ho[Fc]==1 then
set I=vx[vo[Fc]*4+Ie]/ oe
if I>0 then
set gc=gc-I
if ge>=3 then
call BI("-"+I2S(I)+" for repeated attack type")
endif
endif
elseif ho[Fc]==2 then
set I=ex[vo[Fc]*4+Ie]/ oe
if I>0 then
set gc=gc-I
if ge>=3 then
call BI("-"+I2S(I)+" for repeated attack type")
endif
endif
elseif ho[Fc]==3 then
set I=(ex[vo[Fc]*4+Ie]+vx[vo[Fc]*4+Ie])/ 2/ oe
if I>0 then
set gc=gc-I
if ge>=3 then
call BI("-"+I2S(I)+" for repeated attack type")
endif
endif
endif
if de>0 then
set I=0
if ho[Fc]==1 or ho[Fc]==3 then
set I=ye[Ae+4*Oe[vo[Fc]]]
endif
if ho[Fc]==2 or ho[Fc]==3 then
set I=I+Ye[Ae+4*Oe[vo[Fc]]]
endif
set I=I*'d'/ de
set K=I*yv/ 'd'
set gc=gc+K
if ge>=3 and I>0 then
call BI("+"+I2S(K)+" for countering the armor of "+I2S(I)+"% of all enemies")
endif
set I=0
if ho[Fc]==1 or ho[Fc]==3 then
set I=ye[Ae+4*Xe[vo[Fc]]]
endif
if ho[Fc]==2 or ho[Fc]==3 then
set I=I+Ye[Ae+4*Xe[vo[Fc]]]
endif
set I=I*'d'/ de
set K=I*zv/ 'd'
set gc=gc-K
if ge>=3 and I>0 then
call BI("-"+I2S(K)+" for beeing bad against the armor of "+I2S(I)+"% of all enemies")
endif
endif
if Ce>0 then
if IsUnitIdType(lx[Fc],UNIT_TYPE_FLYING) then
set I=ye[xo[Fc]*4+Ie]/ oe
if I>0 then
set gc=gc-I
if ge>=3 then
call BI("-"+I2S(I)+" for repeated armor type")
endif
endif
set I=vx[Ae+4*Re[xo[Fc]]]
else
set I=Ye[xo[Fc]*4+Ie]/ oe
if I>0 then
set gc=gc-I
if ge>=3 then
call BI("-"+I2S(I)+" for repeated armor type")
endif
endif
set I=ex[Ae+4*Re[xo[Fc]]]
endif
set I=I*'d'/ Ce
set K=I*Yv/ 'd'
set gc=gc+K
if ge>=3 and I>0 then
call BI("+"+I2S(K)+" for countering the attack of "+I2S(I)+"% of all enemies")
endif
if IsUnitIdType(lx[Fc],UNIT_TYPE_FLYING) then
set I=vx[Ae+4*Ee[xo[Fc]]]
else
set I=ex[Ae+4*Ee[xo[Fc]]]
endif
set I=I*'d'/ Ce
set K=I*Zv/ 'd'
set gc=gc-K
if ge>=3 and I>0 then
call BI("-"+I2S(K)+" for having a bad armor against the attack of "+I2S(I)+"% of all enemies")
endif
endif
if de>0 then
if ho[Fc]==1 and ze[Ae]*'d'/ de<=ne then
set gc=gc-ae
if ge>=3 then
call BI("-"+I2S(ae)+" for beeing able to attack less than "+I2S(ne)+"% of all enemies")
endif
elseif ho[Fc]==2 and Ze[Ae]*'d'/ de<=ne then
set gc=gc-ae
if ge>=3 then
call BI("-"+I2S(ae)+" for beeing able to attack less than "+I2S(ne)+"% of all enemies")
endif
endif
endif
if vo[Fc]==3 then
set I=ve+R2I(I2R(Ne)*xe)
if I>ee then
set I=ee
endif
set gc=gc+I
if ge>=3 then
if I>=0 then
call BI("+"+I2S(I)+" for beeing a Siege Creep Building")
else
call BI(I2S(I)+" for beeing a Siege Creep Building")
endif
endif
endif
return gc
endfunction
function hc takes integer SB,integer II returns nothing
local integer Fc=0
local integer fc
local integer gc=1
set Fc=GetUnitPointValueByType(II)
set fc=Fx[Fc]+ca[Fc]
if ge>=3 then
call BI("|cffFFFF80-- Begin of "+Lr[SB]+"|cffFFFF80's calculation for "+GetObjectName(II)+" (Tier "+I2S(Pe[SB])+") --|r")
endif
if Fx[Fc]>Nx[Pe[SB]]or ca[Fc]>Nx[Pe[SB]]or fc>bx[Pe[SB]]or(fc<Ax[Pe[SB]]and gi[Fc]<2)or(Pe[SB]!=CF_PeN[SB]and Fx[Fc]>ce)then
if ge>=3 then
call BI("Building out of price range ("+I2S(fc)+")")
endif
set gc=0
endif
if Se[Fi[SB]] and qe[Fc]==1 and gi[Fc]==3 and be>=Tx[Fc]then
set Je[SB]=II
set Se[Fi[SB]]=false
if ge>=3 then
call BI("<<< Forced to build a tower >>>")
endif
elseif Hi==false and(Vx[SB]+1)*re<=Ne and be>=Tx[GetUnitPointValueByType('h008')]then
set Je[SB]='h008'
if ge>=3 then
call BI("<<< Forced to build a treasure box >>>")
endif
elseif((V[GetUnitPointValueByType((II))]) and Be>0 and be>=Tx[Fc]and I2R(Ne)>(I2R(Fx[Fc])/ 10))then
set Je[SB]=II
if ge>=3 then
call BI("<<< Forced to build a legendary structure >>>")
endif
elseif(gc!=0)then
if((ro[Fc]==To and qe[Fc]==1)or(V[GetUnitPointValueByType((II))]) or II=='h008')then
set gc=0
else
if gi[Fc]<2 then
set gc=Gc(SB,II,fc)
if gc>=ke[SB]then
set He[SB]=II
set ke[SB]=gc
endif
elseif le[SB]and gi[Fc]==2 then
set gc=Dc(SB,II,fc)
if gc>=Ke[SB]then
set je[SB]=II
set Ke[SB]=gc
endif
endif
endif
endif
if ge>=3 and gc>0 then
call BI("Final multiplier: "+I2S(gc))
endif
endfunction
function Hc takes integer SB returns nothing
local integer i=0
if ge>=3 then
call BI("|cffFFBF00*** Begin of "+Lr[SB]+"|cffFFBF00's tactics calculation ***|r")
endif
set Ke[SB]=0
set ke[SB]=0
if GetRandomInt(0,99)<35 then
set le[SB]=true
endif
loop
exitwhen i>=Te[ui[SB]]
call hc(SB,ue[ui[SB]*30+i])
set i=i+1
endloop
set le[SB]=false
endfunction
function jc takes nothing returns boolean
return(GetUnitTypeId(GetFilterUnit())==Qe[GetUnitPointValueByType(G)])
endfunction
function Jc takes nothing returns nothing
local integer i=0
loop
exitwhen i>11
if GetPlayerController(Player(i))==MAP_CONTROL_COMPUTER then
call ZR(i+1)
if GetAIDifficulty(Player(i))==AI_DIFFICULTY_INSANE then
set pe[i+1]=1.33
endif
endif
set i=i+1
endloop
endfunction
function kc takes nothing returns nothing
local integer i
set Ge=Condition(function jc)
set i=0
loop
exitwhen i>12
set pe[i]=1
set i=i+1
endloop
set me=CreateGroup()
set te[0]=CreateTimer()
set te[1]=CreateTimer()
set Me=CreateForce()
set ix[0]=CreateGroup()
set ix[1]=CreateGroup()
set ax[0]=CreateGroup()
set ax[1]=CreateGroup()
set nx[0]=CreateGroup()
set nx[1]=CreateGroup()
set We[0]=La
set Ox[0]=wa
set Ox[0+4]=qa
set Ox[0+8]=qa
set Ox[0+12]=La
set Ex[0]=ua
set Ex[0+4]=ua
set Ex[0+8]=Sa
set Ex[0+12]=Sa
set Xx[0]=Ya
set Xx[0+4]=Ya
set Xx[0+8]=qa
set Xx[0+12]=La
set We[1]=vn
set Ox[1]=Pa
set Ox[1+4]=qa
set Ox[1+8]=qa
set Ox[1+12]=vn
set Ex[1]=Ua
set Ex[1+4]=Ua
set Ex[1+8]=Sa
set Ex[1+12]=Sa
set Xx[1]=za
set Xx[1+4]=za
set Xx[1+8]=pa
set Xx[1+12]=vn
set We[2]=ma
set Ox[2]=ga
set Ox[2+4]=Qa
set Ox[2+8]=Qa
set Ox[2+12]=ma
set Ex[2]=ta
set Ex[2+4]=ta
set Ex[2+8]=en
set Ex[2+12]=en
set Xx[2]=Wa
set Xx[2+4]=Wa
set Xx[2+8]=Qa
set Xx[2+12]=ma
set We[3]=Ma
set Ox[3]=la
set Ox[3+4]=sa
set Ox[3+8]=sa
set Ox[3+12]=Ma
set Ex[3]=Ta
set Ex[3+4]=Ta
set Ex[3+8]=en
set Ex[3+12]=en
set Xx[3]=ya
set Xx[3+4]=ya
set Xx[3+8]=sa
set Xx[3+12]=Ma
call Jc()
endfunction
function Kc takes integer SB,integer lc,boolean Lc returns nothing
if Lc then
call SaveInteger(CF_HD,30+SB,lc,LoadInteger(CF_HD,30+SB,lc)+1)
if lc==je[SB]then
set je[SB]=0
endif
endif
if Je[SB]>0 and lc==Je[SB]then
set Je[SB]=0
endif
if(lc=='h008')then
set Vx[SB]=Vx[SB]+1
endif
if not(V[GetUnitPointValueByType((lc))])and gi[GetUnitPointValueByType(lc)]==2 then
set le[SB]=true
endif
if GetRandomInt(0,99)<Ve or(Pe[SB]!=CF_PeN[SB]and Pe[SB]>=3)then
set Le[SB]=true
else
set Le[SB]=false
endif
if not Lc and ge>=1 then
call BI(Lr[SB]+" was unable to build "+GetObjectName(lc)+"!")
endif
endfunction
function mc takes integer SB,integer Mc returns nothing
local location l
local group g
local integer i=0
local integer UB
set UB=GetUnitPointValueByType(Mc)
if ge>=1 then
call BI(Lr[SB]+" wants to build "+pi+GetObjectName(Mc)+"("+I2S(Mc)+")")
endif
if(Fx[UB]<=ce)then
if(Tx[UB]>be)then
if ge>=1 then
call BI(Lr[SB]+" has insufficient lumber! THIS MAY NOT HAPPEN, Send replay to gex!")
endif
call Kc(SB,Mc,false)
endif
else
if ge>=1 then
call BI(Lr[SB]+" has insufficient funds!")
endif
return
endif
if qe[UB]==3 then
set G=Mc
set g=CreateGroup()
call GroupEnumUnitsOfPlayer(g,Player(SB-1),Ge)
if(CountUnitsInGroup(g)>0)then
set U=GroupPickRandomUnit(g)
set P=GetOwningPlayer(U)
call SetUnitOwner(U,Player(15),false)
call SetUnitOwner(U,P,true)
call IssueImmediateOrderById(U,Mc)
call Kc(SB,Mc,true)
else
if ge>=1 then
call BI(Lr[SB]+" cannot upgrade, because the predecessor is missing!")
endif
call mc(SB,Qe[UB])
endif
call DestroyGroup(g)
set g=null
else
if(qe[UB]==1)then
set he=Ex[Rx[SB*3+1]*4+Ie]
elseif(qe[UB]==2)then
set he=Xx[Rx[SB*3+2]*4+Ie]
else
set he=Ox[Rx[SB*3+0]*4+Ie]
endif
call SetUnitPosition(br[SB],GetPlayerStartLocationX(Player(SB-1)),GetPlayerStartLocationY(Player(SB-1)))
set i=0
loop
exitwhen i>14
set i=i+1
set l=GetRandomLocInRect(he)
if not IssueBuildOrderById(br[SB],Mc,GetLocationX(l),GetLocationY(l))then
if(i==15)then
if Rx[SB*3+qe[UB]]==3 then
if qe[UB]==1 then
call Kc(SB,Mc,false)
endif
else
set Rx[SB*3+qe[UB]]=Rx[SB*3+qe[UB]]+1
endif
if ge>=1 then
call BI(Lr[SB]+" cannot build, no building space found!")
endif
endif
else
call Kc(SB,Mc,true)
set i=15
endif
call RemoveLocation(l)
set l=null
endloop
endif
endfunction
function pc takes nothing returns nothing
local integer SB=GetPlayerId(GetEnumPlayer())+1
set Ie=(SB/ 7)*2+(ModuloInteger((SB),2))
set Ae=(1-(SB/ 7))*2+(ModuloInteger((SB),2))
set Ne=Wr[SB]
set be=GetPlayerState(Player(SB-1),PLAYER_STATE_RESOURCE_LUMBER)
set ce=GetPlayerState(Player(SB-1),PLAYER_STATE_RESOURCE_GOLD)
set Be=GetPlayerState(Player(SB-1),PLAYER_STATE_RESOURCE_FOOD_CAP)-GetPlayerState(Player(SB-1),PLAYER_STATE_RESOURCE_FOOD_USED)
set Ce=xx[Ae]+ox[Ae]-rx[Ae]
set de=ze[Ae]+Ze[Ae]
if Pe[SB]!=CF_PeL[SB]then
set CF_PeN[SB]=Pe[SB]
endif
set Pe[SB]=CF_PeN[SB]
if Ne>Ix[Pe[SB]]then
set Pe[SB]=Pe[SB]+1
endif
set CF_PeN[SB]=Pe[SB]
if ce>=800 and Pe[SB]<4 then
set Pe[SB]=4
elseif ce>=560 and Pe[SB]<3 then
set Pe[SB]=3
elseif ce>=360 and Pe[SB]<2 then
set Pe[SB]=2
endif
set CF_PeL[SB]=Pe[SB]
if CF_BotReady(SB)then
if Je[SB]<=0 then
call Hc(SB)
endif
if Je[SB]>0 then
call mc(SB,Je[SB])
elseif je[SB]!=0 and be>=Tx[GetUnitPointValueByType(je[SB])]and Le[SB]then
set Je[SB]=je[SB]
call mc(SB,Je[SB])
else
if ce>=Fx[GetUnitPointValueByType(He[SB])]then
set Je[SB]=He[SB]
endif
call mc(SB,He[SB])
endif
endif
endfunction
function Pc takes nothing returns nothing
call RemoveUnit(GetEnumUnit())
endfunction
function qc takes nothing returns nothing
call xc(false)
set hx=false
set Bi=false
if Tr!=null then
call TimerDialogDisplay(Tr,false)
call DestroyTimerDialog(Tr)
set Tr=null
call PauseTimer(jr)
endif
if jx>0 then
set gE=false
call FogEnable(false)
call PauseTimer(gr)
elseif jx==-1 then
set gE=false
call FogEnable(false)
endif
call DisableTrigger(Ln)
call DisableTrigger(xE)
call DisableTrigger(hn)
call DisableTrigger(Hn)
call DisableTrigger(gn)
call DisableTrigger(Gn)
call DisableTrigger(BV)
call DisableTrigger(fV)
call PauseTimer(lr)
call PauseTimer(Qr)
call PauseTimer(ko)
call PauseTimer(Na)
call TriggerSleepAction(3.)
call CinematicFadeBJ(1,2,"ReplaceableTextures\\CameraMasks\\Black_mask.blp",0,0,0,6.)
call ForGroupBJ(Lo,function Pc)
endfunction
function Qc takes nothing returns boolean
return(GetPlayerSlotState(GetEnumPlayer())==PLAYER_SLOT_STATE_PLAYING)
endfunction
function sc takes nothing returns nothing
if(Qc())then
set qr=(qr+1)
set di[(1+GetPlayerId(GetEnumPlayer()))]=true
call ForceAddPlayer(Ba,GetEnumPlayer())
call ForceAddPlayer(wo[Fi[(1+GetPlayerId(GetEnumPlayer()))]],GetEnumPlayer())
set Zi[Fi[(1+GetPlayerId(GetEnumPlayer()))]]=(Zi[Fi[(1+GetPlayerId(GetEnumPlayer()))]]+1)
set Mi=GetRandomInt(0,7)
set ui[(1+GetPlayerId(GetEnumPlayer()))]=GetRandomInt(0,Yr)
endif
endfunction
function Sc takes nothing returns boolean
return(GetPlayerController(Player(-1+(bj_forLoopAIndex)))==MAP_CONTROL_COMPUTER)
endfunction
function tc takes nothing returns nothing
call InitGameCacheBJ("cf.w3v")
set gx=bj_lastCreatedGameCache
call InitGameCacheBJ("cf2.w3v")
set vr=bj_lastCreatedGameCache
call CinematicFadeBJ(1,.0,"ReplaceableTextures\\CameraMasks\\Black_mask.blp",.0,0,0,6.)
set Px=GetRectCenter(bj_mapInitialPlayableArea)
set sx=GetRectCenter(bj_mapInitialPlayableArea)
set aa=GetRectCenter(bj_mapInitialPlayableArea)
set Oo=GetRectMinX(bj_mapInitialPlayableArea)
set fr=GetRectMaxX(bj_mapInitialPlayableArea)
set Xo=GetRectMinY(bj_mapInitialPlayableArea)
set Fr=GetRectMaxY(bj_mapInitialPlayableArea)
set pi="|cffFFFF00"
set Di[0]='Vstp'
set Di[1]='Adrt'
set Di[2]='Adrg'
set Di[3]='Agrs'
set Di[4]='Agrd'
set Di[5]='Alvd'
set Di[6]='Zdtr'
set Di[7]='Avin'
set Vi[0]='ATtr'
set Vi[1]='ATtc'
set Ni[0]='B002'
set Ni[1]='B003'
set Ni[2]='B004'
set Ni[3]='B005'
set Ni[4]='B006'
set No[0]="|cffff0303"
set No[1]="|cff20c000"
set Ji[0]="|cffff0303Западные силы|r"
set Ji[1]="|cff20c000Восточные силы|r"
set Fo[1]="|cffff0303"
set Fo[2]="|cff0042ff"
set Fo[3]="|cff1ce69b"
set Fo[4]="|cff540081"
set Fo[5]="|cfffffc01"
set Fo[6]="|cfffe8a0e"
set Fo[7]="|cff20c000"
set Fo[8]="|cffe55bb0"
set Fo[9]="|cff959697"
set Fo[10]="|cff7ebff1"
set Fo[11]="|cff106246"
set Fo[12]="|cff4e2a04"
set mo[0]=.0
set mo[1]=1.
set mo[2]=1.85
set mo[3]=2.57
set mo[4]=3.18
set mo[5]=3.7
set mo[6]=4.14
set mo[7]=4.52
set mo[8]=4.84
set mo[9]=5.11
set bj_forLoopAIndex=1
set bj_forLoopAIndexEnd=12
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
set Lr[bj_forLoopAIndex]=(Fo[bj_forLoopAIndex]+(GetPlayerName(Player(-1+(bj_forLoopAIndex)))+"|r"))
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
call TriggerExecute(Xn)
set sr[0]='u002'
set sr[1]='n00D'
set sr[2]='u00A'
set sr[3]='n00C'
set sr[4]='u00B'
set sr[5]='n01L'
set sr[6]='u003'
set sr[7]='n01M'
set Yr=10
set ti[0]='h00C'
set Go[0]="Людей"
set ti[1]='h00E'
set Go[1]="Наг"
set ti[2]='h00O'
set Go[2]="Хаос"
set ti[3]='h00P'
set Go[3]="Эльфийский союз"
set ti[4]='h018'
set Go[4]="Нежить"
set ti[5]='h019'
set Go[5]="Орков"
set ti[6]='h017'
set Go[6]="Северных жителей"
set ti[7]='u006'
set Go[7]="Порчу"
set ti[8]='h089'
set Go[8]="Ночных эльфов"
set ti[9]='h06P'
set Go[9]="Техников"
set ti[10]='cg00'
set Go[10]="Сборщиков"
set xr[0]=GetUnitLoc(fE)
set xr[1]=GetUnitLoc(FE)
set Ui[1]="первый"
set Ui[2]="второй"
set Ui[3]="третий"
set Ui[4]="четвертый"
set bj_forLoopAIndex=1
set bj_forLoopAIndexEnd=12
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
call SetPlayerFlagBJ(PLAYER_STATE_GIVES_BOUNTY,true,Player(-1+(bj_forLoopAIndex)))
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
call FogEnableOff()
call FogMaskEnableOff()
call SetTimeOfDay(12)
call SetMapFlag(MAP_LOCK_RESOURCE_TRADING,true)
set Yx[0]=GetRectCenter(Ha)
set Yx[1]=GetRectCenter(ja)
set ux[0]=ja
set ux[1]=Ha
set Mx[0]=Ga
set Mx[1]=ha
set qx[0]=ha
set qx[1]=Ga
set qr=0
set bj_forLoopAIndex=1
set bj_forLoopAIndexEnd=6
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
set Fi[bj_forLoopAIndex]=0
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
set bj_forLoopAIndex=7
set bj_forLoopAIndexEnd=12
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
set Fi[bj_forLoopAIndex]=1
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
call ForForce(bj_FORCE_ALL_PLAYERS,function sc)
set bj_forLoopAIndex=1
set bj_forLoopAIndexEnd=12
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
if(Sc())then
set Uo=true
endif
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
call DestroyTimer(si)
set si=CreateTimer()
call StartTimerBJ(si,false,99999)
call CreateQuestBJ(0,"Игровые моды","TRIGSTR_5255","ReplaceableTextures\\CommandButtons\\BTNPickUpItem.blp")
call CreateQuestBJ(0,"Дополнительные моды","TRIGSTR_5257","ReplaceableTextures\\CommandButtons\\BTNSpy.blp")
call CreateQuestBJ(0,"Другие команды","TRIGSTR_5259","ReplaceableTextures\\CommandButtons\\BTNAuraOfDarkness.blp")
call CreateQuestBJ(2,"Впервые в кф?","TRIGSTR_5261","ReplaceableTextures\\CommandButtons\\BTNSelectHeroOff.blp")
call CreateQuestBJ(2,"Подсказки","TRIGSTR_5263","ReplaceableTextures\\CommandButtons\\BTNSelectHeroOff.blp")
call CreateQuestBJ(2,"О карте","TRIGSTR_5265","ReplaceableTextures\\CommandButtons\\BTNTomeOfRetraining.blp")
endfunction
function Tc takes nothing returns nothing
set bj_forLoopAIndex=1
set bj_forLoopAIndexEnd=11
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
call DisplayTimedTextToPlayer(Player(bj_forLoopAIndex),0,0,30.,(("Добро пожаловать в |cffFFFF80Castle Fight|r! |cffFF0000"+GetPlayerName(Player(0))+"|r должен установить игровые моды в течении 15 секунд.")))
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
call DisplayTimedTextToPlayer(Player(0),0,0,30.,"Добро пожаловать в |cffFFFF80Castle Fight|r! У вас есть 15 секунд, чтобы ввести игровые моды. Если вы не сделаете этого, вы сможете выбрать мод через диаологовое окно. Если вы не знаете какой мод вводить - прочтите Справочник (|cffFFBA17F9|r).")
if Uo then
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,90.,"|cffFF0000Внимание: Вы играете с компьютерными слотами. Это может вызвать множество багов. Если вы хотите играть с ботами, используйте команды -fill -east -west и -balance чтобы добавлять ботов.")
endif
endfunction
function uc takes integer Uc,string wc returns nothing
local integer nI
if Ri or(wc!="siege" and Ea)then
set nI=1
loop
exitwhen nI>12
call SetPlayerUnitAvailableBJ(Uc,false,Player(-1+(nI)))
set nI=nI+1
endloop
endif
endfunction
function Wc takes integer Uc,integer yc,integer Yc,integer zc,integer Zc,integer vC,integer eC returns nothing
local integer xC
set xC=GetUnitPointValueByType(Uc)
set Fx[xC]=yc
set ro[xC]=Dx
set lx[xC]=Yc
set qe[xC]=0
set xo[xC]=zc
set vo[xC]=Zc
set ki[xC]=vC
set ca[xC]=0
set Tx[xC]=0
set gi[xC]=0
set ho[xC]=eC
if(NI(Uc))then
set ue[vC*30+Te[vC]]=Uc
set Ue[xC]=Te[vC]
set Te[vC]=Te[vC]+1
endif
endfunction
function oC takes integer Uc,integer yc,integer Yc,integer zc,integer Zc,integer vC,integer eC returns nothing
local integer xC
set xC=GetUnitPointValueByType(Uc)
set Fx[xC]=yc
set ro[xC]=ea
set lx[xC]=Yc
set qe[xC]=0
set ca[xC]=0
set xo[xC]=zc
set vo[xC]=Zc
set ki[xC]=vC
set Tx[xC]=0
set gi[xC]=1
set ho[xC]=eC
if(RI(Uc))then
set ue[vC*30+Te[vC]]=Uc
set Ue[xC]=Te[vC]
set Te[vC]=Te[vC]+1
endif
call uc(Uc,"siege")
endfunction
function rC takes integer Uc,integer yc,real iC,integer aC,integer vC,integer nC returns nothing
local integer xC
set xC=GetUnitPointValueByType(Uc)
set Fx[xC]=yc
set ro[xC]=iC
set lx[xC]='h023'
set qe[xC]=aC
set ki[xC]=vC
set Tx[xC]=nC
set vo[xC]=6
set ca[xC]=0
set gi[xC]=2
if(RI(Uc))then
set ue[vC*30+Te[vC]]=Uc
set Ue[xC]=Te[vC]
set Te[vC]=Te[vC]+1
endif
call uc(Uc,"special")
endfunction
function VC takes integer Uc,integer yc,integer vC,integer nC returns nothing
local integer xC
set xC=GetUnitPointValueByType(Uc)
set Fx[xC]=yc
set ro[xC]=To
set lx[xC]='h023'
set qe[xC]=1
set ki[xC]=vC
set ca[xC]=0
set Tx[xC]=nC
set vo[xC]=6
set gi[xC]=3
if(RI(Uc))then
set ue[vC*30+Te[vC]]=Uc
set Ue[xC]=Te[vC]
set Te[vC]=Te[vC]+1
endif
call uc(Uc,"special")
endfunction
function EC takes integer Uc,integer yc,integer Yc,integer XC,integer OC,integer zc,integer Zc,integer vC,integer eC returns nothing
local integer xC
set xC=GetUnitPointValueByType(Uc)
call Wc(Uc,yc,Yc,zc,Zc,vC,eC)
set qe[xC]=3
set ca[xC]=XC
set Qe[xC]=OC
endfunction
function RC takes integer Uc,integer yc,integer Yc,integer XC,integer OC,integer zc,integer Zc,integer vC,integer eC returns nothing
local integer xC
set xC=GetUnitPointValueByType(Uc)
call oC(Uc,yc,Yc,zc,Zc,vC,eC)
set qe[xC]=3
set ca[xC]=XC
set Qe[xC]=OC
endfunction
function IC takes integer Uc,integer yc,real iC,integer XC,integer OC,integer vC,integer nC returns nothing
local integer xC
set xC=GetUnitPointValueByType(Uc)
call rC(Uc,yc,iC,3,vC,nC)
set ca[xC]=XC
set Qe[xC]=OC
call uc(Uc,"special")
endfunction
function AC takes nothing returns nothing
local integer vC=0
local integer i
local integer NC=0
local integer bC=1
local integer BC=2
local integer cC=3
local integer CC=4
local integer Attack_AntiAir=5
local integer dC=0
local integer DC=1
local integer fC=2
local integer FC=3
local integer gC=4
local integer GC=2
local integer hC=1
set Dx=.2
set ea=.18
set To=.08
set oa=.12
set rr=.09
set i=0
loop
exitwhen i>Yr
set Te[i]=0
set i=i+1
endloop
call rC('h008',330,rr,2,vC,400)
set vC=0
call Wc('h037',280,'h03B',dC,CC,vC,2)
call EC('h038',245,'h03C',280,'h037',dC,CC,vC,2)
call Wc('h015',275,'h016',DC,NC,vC,3)
call Wc('h00K',300,'n005',FC,CC,vC,3)
call oC('h004',210,'hmtm',fC,cC,vC,2)
call Wc('h003',140,'hrif',DC,BC,vC,3)
call EC('h0A1',160,'h05C',140,'h003',DC,BC,vC,1)
call EC('h05D',180,'h0A2',140,'h003',DC,BC,vC,2)
call Wc('h000','d','hfoo',dC,bC,vC,2)
call EC('h039',175,'h03A','d','h000',dC,bC,vC,2)
call VC('h006',150,vC,300)
call rC('h05G',700,oa,GC,vC,1800)
call rC('h010',225,oa,hC,vC,750)
call rC('h001',200,rr,GC,vC,360)
set vC=1
call Wc('h01Z',350,'n00S',FC,CC,vC,3)
call Wc('h00J',175,'n004',DC,bC,vC,3)
call EC('h05F',725,'n01P',175,'h00J',DC,CC,vC,3)
call oC('h01B',280,'n007',dC,cC,vC,3)
call Wc('h00H','x','n003',FC,bC,vC,2)
call EC('h020',130,'n00I','x','h00H',FC,bC,vC,2)
call EC('h021',150,'n00J',250,'h020',FC,bC,vC,2)
call EC('h022',200,'n00K',400,'h021',FC,bC,vC,2)
call Wc('h01Y',255,'n00H',fC,NC,vC,3)
call Wc('h00F',250,'n002',dC,BC,vC,2)
call EC('h032',200,'n00X',250,'h00F',dC,BC,vC,2)
call rC('h00N',750,rr,GC,vC,1500)
call rC('h00M',310,oa,GC,vC,625)
call rC('h00I',360,oa,GC,vC,600)
call rC('h00G',250,oa,hC,vC,480)
set vC=2
call Wc('h025',280,'n00L',FC,CC,vC,2)
call Wc('h01I','x','n00A',fC,bC,vC,3)
call EC('h026',230,'z000','x','h01I',fC,bC,vC,3)
call Wc('h01C',230,'n008',fC,NC,vC,3)
call Wc('h01D',160,'n009',DC,bC,vC,2)
call EC('h03G',190,'n00Z',160,'h01D',DC,bC,vC,2)
call Wc('h009',385,'n001',dC,CC,vC,3)
call Wc('h007',500,'n000',dC,CC,vC,3)
call rC('h05I',200,rr,GC,vC,330)
call rC('h01M',350,rr,GC,vC,1000)
call IC('h01W',175,rr,350,'h01M',vC,350)
call IC('h01X',175,rr,525,'h01W',vC,350)
call rC('h01F',340,rr,GC,vC,660)
call rC('h01E',850,oa,GC,vC,1800)
set vC=3
call Wc('h09X',360,'h07B',FC,NC,vC,3)
call EC('h00X',440,'h00W',360,'h09X',FC,CC,vC,3)
call Wc('h00V',275,'h00U',DC,NC,vC,3)
call Wc('h00T',220,'n006',dC,bC,vC,2)
call EC('h03F',230,'n00Y',220,'h00T',dC,bC,vC,2)
call Wc('h08X',180,'n022',FC,BC,vC,3)
call EC('h08Y',200,'n023',180,'h08X',FC,BC,vC,3)
call oC('h070',350,'e005',DC,cC,vC,2)
call Wc('h06Y',340,'n01Y',dC,BC,vC,3)
call VC('h014',250,vC,300)
call rC('h059',650,oa,GC,vC,1800)
call rC('h00Z',240,oa,GC,vC,420)
call rC('h005',235,oa,GC,vC,450)
set vC=4
call Wc('h01K',210,'u005',FC,NC,vC,3)
call EC('h04B',170,'u009',210,'h01K',FC,NC,vC,3)
call EC('h055',370,'u00D',380,'h04B',FC,NC,vC,3)
call oC('h01T',370,'n00E',DC,cC,vC,2)
call Wc('h01N',230,'h01U',dC,BC,vC,2)
call EC('h054',245,'h05H',230,'h01N',dC,BC,vC,2)
call Wc('h01L',290,'u001',gC,NC,vC,3)
call Wc('h01S',550,'u000',fC,bC,vC,3)
call Wc('h01R','x','n00B',DC,CC,vC,2)
call EC('h04Z','d','n01K','x','h01R',DC,CC,vC,2)
call EC('h03M',205,'u007',220,'h04Z',DC,CC,vC,2)
call VC('h01O',200,vC,300)
call rC('h01Q',650,rr,GC,vC,1500)
call rC('h01P',160,oa,GC,vC,0)
call IC('h056',140,oa,160,'h01P',vC,0)
call rC('h00A',360,rr,GC,vC,575)
set vC=5
call Wc('h02P',240,'o009',FC,BC,vC,3)
call Wc('h02K',260,'o007',fC,BC,vC,2)
call EC('h092',155,'o00B',260,'h02K',fC,BC,vC,3)
call EC('h035',155,'o008',260,'h02K',fC,BC,vC,3)
call EC('h036',155,'o006',260,'h02K',fC,BC,vC,3)
call Wc('h029','n','o002',dC,bC,vC,2)
call EC('h02U','d','o004','n','h029',dC,bC,vC,2)
call EC('h031',240,'o005',210,'h02U',dC,bC,vC,2)
call Wc('h02B',170,'o003',FC,NC,vC,3)
call oC('h02I',380,'o001',DC,cC,vC,2)
call Wc('h02H',200,'n00V',DC,bC,vC,3)
call EC('h05E',120,'n01O',200,'h02H',DC,bC,vC,3)
call VC('o000',175,vC,300)
call rC('h02R',250,oa,GC,vC,540)
call rC('h02O',475,oa,GC,vC,1350)
call rC('h02N',350,rr,GC,vC,750)
set vC=6
call Wc('h049','s','n017',FC,bC,vC,2)
call EC('h04F','}','n018','s','h049',FC,bC,vC,2)
call EC('h03W',280,'n016',240,'h04F',FC,bC,vC,2)
call Wc('h03T',275,'n012',DC,BC,vC,2)
call EC('h043',225,'n013',275,'h03T',DC,BC,vC,2)
call Wc('h03S',400,'n014',FC,CC,vC,3)
call Wc('h03K',175,'n015',fC,NC,vC,3)
call EC('h03J',150,'o00A',175,'h03K',fC,NC,vC,3)
call Wc('h03U',160,'n011',dC,BC,vC,3)
call Wc('h03I',310,'n010',dC,CC,vC,3)
call VC('h03Q',230,vC,300)
call rC('h047',190,oa,GC,vC,350)
call rC('h048',210,rr,GC,vC,475)
call IC('h03L',290,rr,210,'h048',vC,575)
call rC('h03O',600,rr,GC,vC,1350)
set vC=7
call Wc('h04V','}','n01I',dC,bC,vC,2)
call EC('h04W','}','n01H','}','h04V',dC,bC,vC,2)
call EC('h09Y',500,'n027',250,'h04W',dC,bC,vC,2)
call Wc('h04U',520,'h04I',DC,CC,vC,3)
call Wc('h04S',240,'n01G',DC,BC,vC,2)
call oC('h04Q',300,'n01F',dC,cC,vC,2)
call RC('h04P',150,'n01E',300,'h04Q',dC,cC,vC,2)
call Wc('h04O',260,'n01D',DC,NC,vC,3)
call EC('h04M',180,'n01B',235,'h04O',DC,NC,vC,3)
call Wc('h04L',190,'n019',fC,NC,vC,3)
call EC('h04N',190,'n01A',190,'h04L',fC,NC,vC,3)
call VC('n01J',200,vC,300)
call rC('h04T',500,oa,GC,vC,1350)
call rC('h04R',260,rr,GC,vC,420)
call rC('h04K',275,rr,GC,vC,420)
set vC=8
call Wc('h088',190,'e007',FC,CC,vC,3)
call EC('h07D',260,'e00J',190,'h088',FC,CC,vC,3)
call Wc('h07M',200,'n01Z',DC,BC,vC,2)
call EC('h07L',175,'n020',200,'h07M',DC,BC,vC,2)
call Wc('h07O',230,'e00B',fC,NC,vC,2)
call EC('h07N',240,'e00A',230,'h07O',fC,NC,vC,2)
call oC('h011',285,'e002',dC,cC,vC,2)
call Wc('h00S',150,'e001',fC,BC,vC,3)
call EC('h03D',200,'e003',150,'h00S',fC,BC,vC,3)
call EC('h03E',400,'e004',350,'h03D',fC,BC,vC,3)
call Wc('h00B',285,'e000',fC,NC,vC,3)
call VC('h073',210,vC,300)
call rC('h07H',220,oa,GC,vC,300)
call rC('h08P',225,oa,GC,vC,600)
call rC('h07I',650,rr,GC,vC,1350)
set vC=9
call Wc('h05T',220,'z002',fC,CC,vC,2)
call EC('h09P',140,'z003',220,'h05T',fC,CC,vC,2)
call Wc('h05U',375,'n01T',DC,BC,vC,2)
call Wc('h05M',200,'n01V',FC,CC,vC,2)
call Wc('h05J',175,'h06Q',fC,BC,vC,1)
call EC('h09L',200,'h06R',160,'h05J',fC,BC,vC,1)
call Wc('h05V',270,'n01X',DC,CC,vC,2)
call EC('h097',500,'n024',270,'h05V',gC,CC,vC,2)
call Wc('h05X',180,'h06T',dC,bC,vC,2)
call EC('h09J',150,'h06U',180,'h05X',dC,bC,vC,2)
call EC('h09I',200,'h099',180,'h05X',dC,CC,vC,2)
call EC('h09B',250,'h06S',180,'h05X',dC,bC,vC,2)
call EC('h09H','d','h098',430,'h09B',dC,bC,vC,2)
call VC('h05L',240,vC,300)
call rC('h09T',340,oa,GC,vC,1050)
call rC('h069',250,oa,GC,vC,480)
call rC('h06J',190,oa,GC,vC,270)
call IC('h05R',140,oa,190,'h06J',vC,130)
set vC=10
call Wc('cg01',150,'cg11',dC,bC,vC,2)
call Wc('cg02',280,'cg12',dC,BC,vC,2)
call EC('cg07',250,'cg13',280,'cg02',dC,BC,vC,2)
call Wc('cg03',240,'cg14',gC,bC,vC,2)
call EC('cg08',260,'cg15',240,'cg03',gC,bC,vC,2)
call Wc('cg04',200,'cg16',DC,bC,vC,3)
call EC('cg09',180,'cg17',200,'cg04',DC,bC,vC,3)
call oC('cg05',330,'cg18',fC,bC,vC,2)
call RC('cg0e',270,'cg1a',330,'cg05',fC,bC,vC,2)
call Wc('cg06',330,'cg19',DC,NC,vC,3)
call EC('cg0f',285,'cg1b',330,'cg06',DC,NC,vC,3)
call VC('cg0a',150,vC,300)
call rC('cg0b',220,rr,GC,vC,420)
call rC('cg0c',300,oa,GC,vC,600)
call rC('cg0d',350,rr,GC,vC,750)
set ei[14]=180
set ei[26]=800
set ei[70]=600
set ei[75]=750
set ei[88]=850
set ei['t']=900
set ei['y']=675
set ei[134]=500
set ei[138]=800
set ei[141]=700
set ei[150]=950
set V[('h05G')]=true
set V[('h05F')]=true
set V[('h00N')]=true
set V[('h01M')]=true
set V[('h01W')]=true
set V[('h01X')]=true
set V[('h01E')]=true
set V[('h00X')]=true
set V[('h059')]=true
set V[('h055')]=true
set V[('h01Q')]=true
set V[('h02O')]=true
set V[('h03O')]=true
set V[('h09Y')]=true
set V[('h04T')]=true
set V[('h03E')]=true
set V[('h07I')]=true
set V[('h097')]=true
set lx[GetUnitPointValueByType('h069')]='n01U'
set gi[GetUnitPointValueByType('h056')]=0
set xo[GetUnitPointValueByType('h056')]=2
set vo[GetUnitPointValueByType('h056')]=7
set ho[GetUnitPointValueByType('h056')]=2
set gi[GetUnitPointValueByType('h01P')]=0
set xo[GetUnitPointValueByType('h01P')]=2
set vo[GetUnitPointValueByType('h01P')]=7
set ho[GetUnitPointValueByType('h01P')]=2
endfunction
function HC takes nothing returns nothing
set Vo=ER(Za)
set co[1]=2
set co[7]=3
set Xa[0]=2
set Xa[1]=3
call CreateMultiboardBJ(6,4,"Выбор мода...")
set ar=bj_lastCreatedMultiboard
call MultiboardSetItemStyleBJ(bj_lastCreatedMultiboard,0,0,true,false)
call MultiboardSetItemStyleBJ(bj_lastCreatedMultiboard,0,0,true,false)
call MultiboardSetItemValueBJ(bj_lastCreatedMultiboard,0,0,"0")
call MultiboardSetItemValueBJ(bj_lastCreatedMultiboard,0,4,"")
call MultiboardSetItemColorBJ(bj_lastCreatedMultiboard,6,0,'d',90.,.0,0)
call MultiboardSetItemValueBJ(bj_lastCreatedMultiboard,1,1,"")
call MultiboardSetItemValueBJ(bj_lastCreatedMultiboard,2,1,"СУ")
call MultiboardSetItemValueBJ(bj_lastCreatedMultiboard,3,1,"Монет")
call MultiboardSetItemValueBJ(bj_lastCreatedMultiboard,4,1,"Унич")
call MultiboardSetItemValueBJ(bj_lastCreatedMultiboard,5,1,"Доход")
call MultiboardSetItemValueBJ(bj_lastCreatedMultiboard,6,1,"|cffFFFF80Побед|r")
call MultiboardSetItemValueBJ(bj_lastCreatedMultiboard,1,2,"|cffFF0000Запад|r")
call MultiboardSetItemValueBJ(bj_lastCreatedMultiboard,1,3,"|cff00FF00Восток|r")
call MultiboardSetItemValueBJ(bj_lastCreatedMultiboard,1,4,"|cffFFFF00Время:|r")
call MultiboardSetItemValueBJ(bj_lastCreatedMultiboard,6,4,"|cffFFFF000|cffFF8000:|cffFFFF0000|r")
call MultiboardSetItemWidthBJ(bj_lastCreatedMultiboard,0,4,2.)
call MultiboardSetItemWidthBJ(bj_lastCreatedMultiboard,1,4,7.)
call MultiboardSetItemWidthBJ(bj_lastCreatedMultiboard,6,4,3)
call MultiboardDisplay(bj_lastCreatedMultiboard,true)
call AddWeatherEffectSaveLast(bj_mapInitialPlayableArea,'SNhs')
set kx=bj_lastCreatedWeatherEffect
call TriggerSleepAction(1.)
call EnableWeatherEffect(kx,false)
endfunction
function jC takes nothing returns nothing
call RemoveUnit(GetEnumUnit())
endfunction
function JC takes nothing returns nothing
call RemoveItem(GetEnumItem())
endfunction
function kC takes nothing returns nothing
if IsDestructableDeadBJ(GetEnumDestructable())then
call DestructableRestoreLife(GetEnumDestructable(),GetDestructableMaxLife(GetEnumDestructable()),true)
endif
endfunction
function KC takes nothing returns nothing
set zi[Fi[(1+GetPlayerId(GetEnumPlayer()))]]=(zi[Fi[(1+GetPlayerId(GetEnumPlayer()))]]+1)
endfunction
function lC takes nothing returns nothing
if not se[(1+GetPlayerId(GetEnumPlayer()))]then
call zI(GetEnumPlayer(),'h033')
else
call rA(GetEnumPlayer())
endif
endfunction
function LC takes nothing returns nothing
call rA(GetEnumPlayer())
endfunction
function mC takes nothing returns nothing
call xA(CreateUnit(GetEnumPlayer(),ti[ui[(1+GetPlayerId(GetEnumPlayer()))]],GetPlayerStartLocationX(GetEnumPlayer()),GetPlayerStartLocationY(GetEnumPlayer()),270))
endfunction
function MC takes nothing returns nothing
call ShowUnit(GetEnumUnit(),true)
call SelectUnitForPlayerSingle(GetEnumUnit(),GetOwningPlayer(GetEnumUnit()))
endfunction
function pC takes nothing returns nothing
local force PC=CreateForce()
local unit qC
call TimerDialogDisplay(Tr,false)
call DestroyTimerDialog(Tr)
set Tr=null
loop
set qC=FirstOfGroup(Do[0])
exitwhen qC==null
call ForceAddPlayer(PC,GetOwningPlayer(qC))
call GroupRemoveUnit(Do[0],qC)
call RemoveUnit(qC)
endloop
loop
set qC=FirstOfGroup(Do[1])
exitwhen qC==null
call ForceAddPlayer(PC,GetOwningPlayer(qC))
call GroupRemoveUnit(Do[1],qC)
call RemoveUnit(qC)
endloop
call ForForce(PC,function LC)
call DestroyForce(PC)
set PC=null
endfunction
// босс привязан к раунду: старый уходит, счётчик наград и очередь линий с нуля, первый босс через 3 минуты
function CF_BossReset takes nothing returns nothing
if CF_Boss!=null then
call RemoveUnit(CF_Boss)
set CF_Boss=null
endif
set CF_BossIdx=0
set CF_BossLane=-1
call TimerStart(CF_BossTm,180.,true,null)
endfunction
// командиры друзей: выбор на раунд (диалог каждому человеку, боты выбирают случайно), бонусы в CF_Up, pF и CF_Forge
function CF_CmdName takes integer c returns string
if c==1 then
return "Саша: +12% к доходу"
elseif c==2 then
return "Алик: кузница дешевле на 50%"
elseif c==3 then
return "Дима: +24% к урону бойцов"
elseif c==4 then
return "Дэн: +24% к скорости атаки бойцов"
elseif c==5 then
return "Юра: 25% шанс критического удара (x2)"
elseif c==6 then
return "Леша: 20% шанс уклониться от атаки"
endif
return "Без командира"
endfunction
function CF_CmdClick takes nothing returns nothing
local integer cf_p=0
local integer cf_k
loop
exitwhen cf_p>11
if GetClickedDialog()==CF_CDlg[cf_p] then
set cf_k=0
loop
exitwhen cf_k>6
if GetClickedButton()==CF_CBtn[cf_p*7+cf_k] then
set CF_Cmd[cf_p]=cf_k

call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,8.,"|cffFFFF00"+GetPlayerName(Player(cf_p))+" выбрал командира: "+CF_CmdName(cf_k)+"|r")
endif
set cf_k=cf_k+1
endloop
endif
set cf_p=cf_p+1
endloop
endfunction
function CF_CmdClose takes nothing returns nothing
local integer cf_p=0
loop
exitwhen cf_p>11
call DialogDisplay(Player(cf_p),CF_CDlg[cf_p],false)
set cf_p=cf_p+1
endloop
set CF_CmdBusy=false
endfunction
// выбор командира ботом (просьба владельца 2026-11-21): только Саша (1), Дима (3) или Дэн (4); внутри команды по возможности разные
function CF_BotPick takes integer p returns integer
local integer cf_q=0
local integer cf_t=0
local integer cf_r
local integer cf_v
local boolean cf_used
set cf_r=GetRandomInt(0,2)
loop
exitwhen cf_t>2
set cf_v=ModuloInteger(cf_r+cf_t,3)
if cf_v==0 then
set cf_v=1
else
set cf_v=cf_v+2
endif
set cf_used=false
set cf_q=0
loop
exitwhen cf_q>=p
if Fi[cf_q+1]==Fi[p+1] and CF_Cmd[cf_q]==cf_v then
set cf_used=true
endif
set cf_q=cf_q+1
endloop
if not cf_used then
return cf_v
endif
set cf_t=cf_t+1
endloop
return 3
endfunction
function CF_CmdRound takes nothing returns nothing
local integer cf_p=0
local integer cf_k
if CF_CmdBusy then
return
endif
set CF_CmdBusy=true
loop
exitwhen cf_p>11
set CF_Cmd[cf_p]=0
if se[cf_p+1] then
set CF_Cmd[cf_p]=CF_BotPick(cf_p)
elseif GetPlayerSlotState(Player(cf_p))==PLAYER_SLOT_STATE_PLAYING then
if GetPlayerController(Player(cf_p))==MAP_CONTROL_USER and not CF_CmdNoDlg and not se[cf_p+1] then
call DialogClear(CF_CDlg[cf_p])
call DialogSetMessage(CF_CDlg[cf_p],"Командир на этот раунд")
set cf_k=0
loop
exitwhen cf_k>6
call DialogAddButtonBJ(CF_CDlg[cf_p],CF_CmdName(cf_k))
set CF_CBtn[cf_p*7+cf_k]=bj_lastCreatedButton
set cf_k=cf_k+1
endloop
call DialogDisplay(Player(cf_p),CF_CDlg[cf_p],true)
elseif GetPlayerController(Player(cf_p))==MAP_CONTROL_COMPUTER or se[cf_p+1] then
set CF_Cmd[cf_p]=CF_BotPick(cf_p)
endif
endif
set cf_p=cf_p+1
endloop
call TimerStart(CF_CmdTm,30.,false,function CF_CmdClose)
endfunction
// ---------- Раса Сборщики: обломки и Великая сборка ----------
function CF_DbAdd takes unit u,integer abil,real sec returns nothing
local integer i=0
local integer f=-1
loop
exitwhen i>63
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
call DestroyEffect(AddSpecialEffectTarget("Abilities\\Spells\\Orc\\Bloodlust\\BloodlustTarget.mdl",u,"overhead"))
endfunction
function CF_DbTick takes nothing returns nothing
local integer i=0
local unit cf_c
local integer cf_n
loop
exitwhen i>63
if CF_DbU[i]!=null then
if CF_DbE[i]<=CF_T or GetWidgetLife(CF_DbU[i])<=.405 then
call UnitRemoveAbility(CF_DbU[i],CF_DbA[i])
set CF_DbU[i]=null
endif
endif
set i=i+1
endloop
// Ремонтный пункт: раз в 20 с чинит замок команды
set CF_SpT=CF_SpT+1
if CF_SpT>=20 then
set CF_SpT=0
set i=0
loop
exitwhen i>11
set cf_n=CF_SpN[i*3+2]
if cf_n>2 then
set cf_n=2
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
call SetWidgetLife(cf_c,GetWidgetLife(cf_c)+GetUnitState(cf_c,UNIT_STATE_MAX_LIFE)*0.03*I2R(cf_n))
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
local integer want=2
local integer abil='Cgb1'
local group g
local group t
local unit u
local unit b
local real best
local real dd
local integer cf_k
local real cf_s=15.0
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
set want=4
set abil='Cgb2'
endif
set cf_k=CF_SpN[p*3]
if cf_k>2 then
set cf_k=2
endif
if cf_k>0 then
call AdjustPlayerStateBJ(2*cf_k,Player(p),PLAYER_STATE_RESOURCE_GOLD)

endif
if CF_SpN[p*3+1]>0 then
set want=want+1
set cf_s=cf_s+5.0
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
function QC takes nothing returns nothing
local group g
local integer i
local player p1
local player p2
call DisableTrigger(nE)
call GA()
call DisableTrigger(OV)
call DisableTrigger(XV)
set cr[0]=0
set cr[1]=0
call ForGroupBJ(tx,function jC)
call GroupClear(Lo)
call GroupClear(da)
set i=0
loop
exitwhen i>1
set lo[i]=0
set i=i+1
endloop
call FlushGameCache(vr)
set vr=InitGameCache("cf2.w3v")
set g=ER(GetWorldBounds())
call ForGroup(g,function nc)
call DestroyGroup(g)
set g=ER(GetWorldBounds())
call ForGroup(g,function nc)
call DestroyGroup(g)
set g=null
call ForGroup(Ki,function jC)
set i=0
loop
exitwhen i>1
call IA(xO[(i)])
call IA(rO[(i)])
call IA(iO[(i)])
call IA(oO[(i)])
set i=i+1
endloop
call EnumItemsInRectBJ(GetWorldBounds(),function JC)
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,9.5,("Приготовтесь к раунду |cffFFCC00"+(I2S(Mr)+"|r!")))
call TriggerSleepAction(5.)
set Bi=true
call CinematicFadeBJ(0,4.,"ReplaceableTextures\\CameraMasks\\Black_mask.blp",0,0,0,6.)
call EnumDestructablesInRectAll(bj_mapInitialPlayableArea,function kC)
call DA(Mr)
if ii==1 then
call VI()
elseif ii==2 then
call XI(xi)
set ii=0
elseif ii==3 then
call iI(zo[0],0)
call iI(zo[1],1)
set zo[0]=0
set zo[1]=0
set ii=0
endif
set ba=.0
set Aa=0
call ForceClear(Xi)
call GroupClear(va)
set bj_forLoopAIndex=1
set bj_forLoopAIndexEnd=12
set i=1
loop
exitwhen i>12
set Pr[i]=false
set yx[i]=.5
set Kx[i]=0
set Kx[i]=0
set Jx[i]=-2
set so[i]=0
set Si[i]=0
set i=i+1
endloop
set i=0
loop
exitwhen i>1
set ri[i]=-1
set wx[i]=0
set Gi[i]=0
set zi[i]=0
call MultiboardSetItemValueBJ(ar,3,Xa[i],"0")
call MultiboardSetItemValueBJ(ar,4,Xa[i],"0")
set i=i+1
endloop
if not fo then
call ForForce(Ba,function KC)
endif
call MultiboardSetItemValueBJ(ar,2,Xa[0],I2S(zi[0]))
call MultiboardSetItemValueBJ(ar,2,Xa[1],I2S(zi[1]))
if mi then
call Cc()
endif
set i=1
loop
exitwhen i>12
if Cx then
call SetPlayerStateBJ(Player(-1+(i)),PLAYER_STATE_RESOURCE_GOLD,'d')
else
call SetPlayerStateBJ(Player(-1+(i)),PLAYER_STATE_RESOURCE_GOLD,CF_Start+IntegerTertiaryOp(se[i],R2I(I2R(CF_Start)*.3),0))
endif
call SetPlayerStateBJ(Player(-1+(i)),PLAYER_STATE_RESOURCE_LUMBER,'}')
if px then
call SetPlayerStateBJ(Player(-1+(i)),PLAYER_STATE_RESOURCE_FOOD_CAP,0)
else
call SetPlayerStateBJ(Player(-1+(i)),PLAYER_STATE_RESOURCE_FOOD_CAP,1)
endif
set i=i+1
endloop
call YI()
set qi=GetRandomInt(0,1)
if Mr>1 and Yi==false then
call ForForce(Ba,function mC)
else
if li then
call Tb()
endif
if Ca==0 then
call ForForce(Ba,function LC)
elseif Ca==2 then
call ForceClear(Ro[0])
call ForceClear(Ro[1])
set i=1
loop
exitwhen i>12
if IsPlayerInForce(Player(i-1),Ba)then
call ForceAddPlayer(Ro[(i-1)/ 6],Player(i-1))
endif
set i=i+1
endloop
loop
set i=vA(Player(0))
set p1=ForcePickRandomPlayer(Ro[0])
set p2=ForcePickRandomPlayer(Ro[1])
if p1!=null then
call ForceRemovePlayer(Ro[0],p1)
call xA(CreateUnit(p1,ti[i],GetPlayerStartLocationX(p1),GetPlayerStartLocationY(p1),bj_UNIT_FACING))
endif
if p2!=null then
call ForceRemovePlayer(Ro[1],p2)
call xA(CreateUnit(p2,ti[i],GetPlayerStartLocationX(p2),GetPlayerStartLocationY(p2),bj_UNIT_FACING))
endif
exitwhen p1==null and p2==null
endloop
elseif Ca==1 then
call ForForce(Ba,function lC)
call TimerStart(jr,34,false,function pC)
set Tr=CreateTimerDialog(jr)
call TimerDialogSetTitle(Tr,"Время выбора:")
call TimerDialogDisplay(Tr,true)
elseif Ca==3 then
call vB()
endif
endif
set i=0
loop
exitwhen i>1
set g=ER(ux[i])
call ForGroup(g,function jC)
call DestroyGroup(g)
set g=null
set bj_lastCreatedUnit=CreateUnitAtLoc(Player(i*6),'hcas',xr[i],270)
set Rr[i]=bj_lastCreatedUnit
set CF_RI=0
loop
exitwhen CF_RI>11
set CF_FA[CF_RI]=0
set CF_FD[CF_RI]=0
set CF_FE[CF_RI]=0
set CF_BotNext[CF_RI]=0.
set CF_BotSave[CF_RI]=false
set CF_RI=CF_RI+1
endloop
set CF_StrikeT[0]=0.
set CF_StrikeT[1]=0.
set CF_BT=0.
call FlushChildHashtable(CF_HD,31)
call FlushChildHashtable(CF_HD,32)
call FlushChildHashtable(CF_HD,33)
call FlushChildHashtable(CF_HD,34)
call FlushChildHashtable(CF_HD,35)
call FlushChildHashtable(CF_HD,36)
call FlushChildHashtable(CF_HD,37)
call FlushChildHashtable(CF_HD,38)
call FlushChildHashtable(CF_HD,39)
call FlushChildHashtable(CF_HD,40)
call FlushChildHashtable(CF_HD,41)
call FlushChildHashtable(CF_HD,42)
call CF_PLog("ROUND start start="+I2S(CF_Start)+" bd="+I2S(CF_BD))
call CF_BossReset()
call CF_CmdRound()
call CF_SpReset()
call SetUnitInvulnerable(bj_lastCreatedUnit,true)
if fi then
call UnitAddAbility(bj_lastCreatedUnit,'Asid')
call AddItemToStock(bj_lastCreatedUnit,'I00B',10,10)
endif
if ji then
call UnitRemoveAbility(bj_lastCreatedUnit,'Aall')
call UnitRemoveAbility(bj_lastCreatedUnit,'Apit')
endif
set i=i+1
endloop
call EnableTrigger(mn)
call TriggerSleepAction(4.)
set hx=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,("Раунд |cffFFCC00"+(I2S(Mr)+"|r начинается! gl & hf!")))
if jx>0 then
set gE=true
call FogEnable(true)
call TimerStart(gr,I2R(jx),false,null)
elseif jx==-1 then
set gE=true
call FogEnable(true)
endif
if Ar then
call EnableTrigger(hn)
call EnableTrigger(Hn)
call EnableTrigger(gn)
call EnableTrigger(Gn)
set jo[0]=1.
set jo[1]=1.
set qo[0]=false
set qo[1]=false
if io!=0 then
set Va[0]=CreateUnit(Player(15),'n026',GetRectCenterX(xn),GetRectCenterY(xn),bj_UNIT_FACING)
endif
if io!=1 then
set Va[1]=CreateUnit(Player(15),'n026',GetRectCenterX(on),GetRectCenterY(on),bj_UNIT_FACING)
endif
endif
call ForGroupBJ(Hx,function MC)
if uo>0 then
call EnableTrigger(BV)
endif
call EnableTrigger(fV)
call EnableTrigger(xE)
call EnableTrigger(ln)
call EnableTrigger(Ln)
call StartTimerBJ(ko,true,Mo)
call StartTimerBJ(Na,true,Mo*4)
call StartTimerBJ(Qr,false,99999.)
call StartTimerBJ(lr,true,1.)
call TriggerSleepAction(3.)
call ac()
call xc(true)
call TriggerSleepAction(3.)
call SetUnitInvulnerable(Rr[0],false)
call SetUnitInvulnerable(Rr[1],false)
endfunction
function sC takes nothing returns nothing
if Wx==1 then
if Ca==0 then
set fx=(Lr[1]+" выбрал один раунд/раса наугад. Вы получите любую расу! Первый раунд определит победителя!")
set Gx="Одиночный раунд наугад"
elseif Ca==2 then
set fx=(Lr[1]+" выбрал один раунд/зеркальные расы. Обе команды получат одинаковые расы наугад! Первый раунд определит победителя!")
set Gx="Одиночный раунд науга"
elseif Ca==1 then
set fx=(Lr[1]+" выбрал один раунд/выбор расы. Вы можете выбрать свою расу! Первый раунд определит победителя!")
set Gx="Одиночный раунд Выбор расы"
elseif Ca==3 then
set fx=(Lr[1]+" выбрал один раунд/призыв рас. Расы будут призваны! Первый раунд определит победителя!")
set Gx="Одиночный раунд Призыв расы"
endif
else
if Ca==0 then
if Yi then
set fx=(Lr[1]+(" выбрал |cffFFFF00раса наугад|r |cffFFFF00каждый раунд|r. Вы будете получать новую расу каждый раунд! Количество побед для выигрыша: |cffFFFF00"+(I2S(Wx)+"|r")))
set Gx=("Наугад каждый раунд, |cffFFCC00"+(I2S(Wx)+"|cffFFFF80 побед"))
else
set fx=(Lr[1]+(" выбрал |cffFFFF00раса наугад|r . Вы получите расу наугад, которой будете играть |cffFFFF00всю игру|r! Количество побед для выигрыша: |cffFFFF00"+(I2S(Wx)+"|r")))
set Gx=("Наугад на всю игру, |cffFFCC00"+(I2S(Wx)+"|cffFFFF80 побед"))
endif
elseif Ca==2 then
if Yi then
set fx=(Lr[1]+(" выбрал |cffFFFF00зеркальные расы каждый раунд|r. Обе команды получат одинаковые расы наугд каждый раунд! Количество побед для выигрыша: |cffFFFF00"+(I2S(Wx)+"|r")))
set Gx=("Зеркальные расы каждый раунд, |cffFFCC00"+(I2S(Wx)+"|cffFFFF80 побед"))
else
set fx=(Lr[1]+(" выбрал |cffFFFF00зеркальные расы|r. Обе команды получат одинаковые расы наугад, которыми будут играть |cffFFFF00всю игру|r! Количество побед для выигрыша: |cffFFFF00"+(I2S(Wx)+"|r")))
set Gx=("Зеркальные расы на всю игру, |cffFFCC00"+(I2S(Wx)+"|cffFFFF80 побед"))
endif
elseif Ca==1 then
if Yi then
set fx=(Lr[1]+(" выбрал |cffFFFF00выбор|r рас |cffFFFF00каждый раунд|r. Вы сможете выбрать свою расу каждый новый раунд! Количество побед для выигрыша: |cffFFFF00"+(I2S(Wx)+"|r")))
set Gx=("Выбор рас каждый раунд, |cffFFCC00"+(I2S(Wx)+"|cffFFFF80 побед"))
else
set fx=(Lr[1]+(" выбрал |cffFFFF00выбор|r расы. Вы должны выбрать расу, которой будете играть |cffFFFF00всю игру|r! Количество побед для выигрыша: |cffFFFF00"+(I2S(Wx)+"|r")))
set Gx=("Выбор расы на всю игру, |cffFFCC00"+(I2S(Wx)+"|cffFFFF80 побед"))
endif
elseif Ca==3 then
if Yi then
set fx=(Lr[1]+(" выбрал |cffFFFF00призыв|r рас |cffFFFF00каждый раунд|r. Ваша раса будет призвана каждый раунд! Количество побед для выигрыша: |cffFFFF00"+(I2S(Wx)+"|r")))
set Gx=("Призыв каждый раунд, |cffFFCC00"+(I2S(Wx)+"|cffFFFF80 побед"))
else
set fx=(Lr[1]+(" выбрал |cffFFFF00призыв|r рас. Ваша раса будет призвана на |cffFFFF00всю игру|r! Количество побед для выигрыша: |cffFFFF00"+(I2S(Wx)+"|r")))
set Gx=("Призыв на всю игру, |cffFFCC00"+(I2S(Wx)+"|cffFFFF80 побед"))
endif
endif
set fx=(fx+"
|cffFF0000(Пожалуйста, не выходите из игры после первого раунда!)|r")
endif
set Gx=("|cffFFFF80"+(Gx+"|r"))
set Ux=true
call MultiboardSetTitleText(ar,Gx)
if not go then
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,25.,fx)
endif
endfunction
function SC takes string c returns boolean
if(c=="r")or(c=="g")then
return true
else
return false
endif
endfunction
function tC takes string c returns boolean
if(c=="r")then
return true
else
return false
endif
endfunction
function TC takes string s returns boolean
local string s1
local string s2
if(s=="")or(s==" ")then
set Wx=1
set Yi=true
return true
endif
set s1=SubStringBJ(s,1,1)
set s2=SubStringBJ(s,2,2)
if(SC(s1))and(KA(s2))then
set Wx=S2I(s2)
set Yi=tC(s1)
else
return false
endif
return true
endfunction
function DisplayBotNum takes nothing returns nothing
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"Количество добавленных ботов: "+Ji[0]+": "+pi+I2S(zo[0])+"|r, "+Ji[1]+": "+pi+I2S(zo[1])+"|r")
endfunction
function uC takes nothing returns nothing
if ii!=1 then
set ii=1
call EnableTrigger(IE)
call DisableTrigger(Jn)
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(Lr[1]+" Активировал Авто-баланс команд! Команды будут сбалансированы перед началом слдущего раунда."))
else
call DisplayTextToPlayer(Player(0),0,0,"|cffFF0000Авто-баланс команд уже включен!|r")
endif
endfunction
function UC takes nothing returns nothing
if ii!=0 then
set ii=0
call EnableTrigger(Jn)
call DisableTrigger(IE)
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(Lr[1]+" отключил авто-баланс команд!"))
endif
endfunction
function wC takes string fb returns nothing
if not lA(fb)then
return
endif
set Pi=S2I(fb)
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Лимит дерева|r был установлен на |cffFFFF00"+fb+"|r.")
endfunction
function WC takes string fb returns nothing
local integer OI
if not lA(fb)then
return
endif
set OI=S2I(fb)
if OI<2 then
set OI=2
elseif OI>'x' then
set OI='x'
endif
set Mo=OI
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Таймер дохода|r был установлен на |cffFFFF00"+I2S(OI)+"|r.")
endfunction
function yC takes string YC returns nothing
local integer zC
local string ZC
local real i=192
if bo then
return
endif
set bo=true
if YC=="u" or YC=="t" then
set zC=-1
elseif YC=="d" or YC=="b" then
set zC=1
elseif YC=="" then
set zC=(GetRandomInt(0,1)*2)-1
else
return
endif
if zC==1 then
set io=0
set ZC="нижней"
else
set io=1
set ZC="верхней"
endif
loop
exitwhen i>Fr
call CreateDestructable('YTfc',1472,i*zC,270,1,0)
call CreateDestructable('YTfc',-1472,i*zC,270,1,0)
set i=i+128
endloop
set i=-1520
loop
exitwhen i>1520
call SetTerrainPathable(i,272*zC,PATHING_TYPE_WALKABILITY,false)
call SetTerrainPathable(i,272*zC,PATHING_TYPE_FLYABILITY,false)
set i=i+32
endloop
call CreateDestructable(Ni[2],1472,640*zC,270,1.1,0)
call CreateDestructable(Ni[2],-1472,640*zC,270,1.1,0)
call CreateDestructable(Ni[2],1472,960*zC,270,1.1,0)
call CreateDestructable(Ni[2],-1472,960*zC,270,1.1,0)
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Одиночная линия|r. Юниты смогут идти/лететь только по |cffFFFF00"+ZC+" линии|r.")
endfunction
function vd takes string ed returns nothing
local integer xd
local integer i=1
if ed=="" then
set xd=-1
else
if not lA(ed)then
return
endif
set xd=S2I(ed)
if(xd<1)then
return
endif
endif
set jx=xd
if Jr[1]==null then
loop
exitwhen i>6
set Jr[i]=CreateFogModifierRectBJ(true,Player(i-1),FOG_OF_WAR_VISIBLE,ha)
set Jr[i+6]=CreateFogModifierRectBJ(true,Player(i-1+6),FOG_OF_WAR_VISIBLE,Ga)
call CreateFogModifierRectBJ(true,Player(i-1+6),FOG_OF_WAR_VISIBLE,Za)
call CreateFogModifierRectBJ(true,Player(i-1),FOG_OF_WAR_VISIBLE,Za)
set i=i+1
endloop
endif
if(xd==-1)then
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"Вечный |cffC6FF00Туман Войны|r")
else
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Туман Войны|r был установлен на |cffFFFF00"+I2S(xd)+"|r секунд.")
endif
endfunction
function od takes nothing returns nothing
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"Время вышло и не все игроки согласились. Дополнительные раунды не будут добавлены!")
call DisableTrigger(vE)
call DestroyForce(er)
endfunction
function rd takes string ad returns nothing
local integer nd
if not lA(ad)then
return
endif
set nd=S2I(ad)
if IsTriggerEnabled(vE)then
call DisplayTextToPlayer(Player(0),0,0,"Вы пока не можете начать новое голосование")
return
endif
if nd<1 or nd>3 then
call DisplayTextToPlayer(Player(0),0,0,"Неверное количество раундов, должно быть между 1 и 3")
return
endif
set er=PA()
set oo=nd
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,30,"|cffC6FF00"+I2S(nd)+" дополнительных раундов!|r. Если вы согласны на добавление этих раундов к игре, напишите |cffFFFF00-agree|r. Если все игроки согласятся, количество раундов увеличится на "+I2S(nd))
call ForceRemovePlayer(er,Player(0))
call EnableTrigger(vE)
call TimerStart(Li,30,false,function od)
call Sb()
endfunction
function Vd takes string Ed returns nothing
local integer OI
if li then
return
endif
if Ed=="" then
set Ed="1"
endif
if not lA(Ed)then
return
endif
set OI=S2I(Ed)
if OI<1 or OI>2 then
call DisplayTextToPlayer(Player(0),0,0,"|cffFF0000Количество банов должно быть между 1 и 2|r")
return
endif
set li=true
set wi=OI
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Бан расы|r. Количество забаненых рас на команду: |cffFFFF00"+I2S(OI)+"|r")
endfunction
function Xd takes player Od,player Rd returns nothing
local integer i=(1+GetPlayerId(Rd))
set di[i]=true
call ForceAddPlayer(Ba,Rd)
call ForceAddPlayer(wo[Fi[i]],Rd)
set Zi[Fi[i]]=(Zi[Fi[i]]+1)
set ui[i]=GetRandomInt(0,Yr)
call SetPlayerAllianceStateBJ(Rd,Od,5)
call SetPlayerAllianceStateBJ(Od,Rd,5)
call jA(Rd,GetPlayerName(Od))
set zr[i-1]=true
call ForceAddPlayer(dr[GetPlayerId(Od)],Rd)
endfunction
function Id takes player Od,integer Ad returns nothing
local integer yI=GetPlayerId(Od)/ 6
local integer i=yI*6
loop
exitwhen i>yI*6+5
if not IsPlayerInForce(Player(i),wo[yI])then
call Xd(Od,Player(i))
set Ad=Ad-1
endif
exitwhen Ad==0
set i=i+1
endloop
endfunction
function Nd takes string Ed returns nothing
local integer array j
local integer i=0
local integer bd
if not lA(Ed)then
return
endif
set bd=S2I(Ed)-1
if bd<1 or bd>5 then
call DisplayTextToPlayer(Player(0),0,0,"|cffFF0000Неверное количество мульти-игроков! Должно быть между 2 и 5!|r")
return
endif
if Uo then
call DisplayTextToPlayer(Player(0),0,0,"|cffFF0000Мульти-игроки невозможны, пока слоты заняты ИИ игроками, используйте -fillX, -eastX или -westX!|r")
return
endif
set j[0]=CountPlayersInForceBJ(wo[0])
set j[1]=CountPlayersInForceBJ(wo[1])
if j[0]*bd>5 or j[1]*bd>5 then
call DisplayTextToPlayer(Player(0),0,0,"|cffFF0000Слишком много игроков для Мульти-игроков!|r")
return
endif
set Oi=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Мульти-игроки|r. Количество игроков на человека: |cffFFFF00"+I2S(bd)+"|r")
loop
exitwhen i>11
if IsPlayerInForce(Player(i),wo[i/ 6])and not zr[i]then
call Id(Player(i),bd)
endif
set i=i+1
endloop
endfunction
function Bd takes string cd returns nothing
local string s=SubString(cd,1,3)
if(cd=="boons")then
call EnableTrigger(bV)
call DisplayTextToPlayer(Player(0),0,0,"Вы активировали подсказки!")
elseif(cd=="noboons")then
call DisableTrigger(bV)
call DisplayTextToPlayer(Player(0),0,0,"Вы отключили подсказки!")
elseif(cd=="balance")and(not Ci)then
call uC()
elseif(cd=="nobalance")and(not Ci)then
call UC()
elseif SubString(cd,0,4)=="fill" then
set s=SubString(cd,4,5)
if(s=="")then
set ii=2
set xi=5
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(Lr[1]+" активировал дополнение команд! Боты вступят в игру перед началом следущего раунда."))
elseif KA(s)then
set xi=S2I(s)
if xi>5 then
set xi=5
endif
set ii=2
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(Lr[1]+" увеличил состав команд на "+s+" игрока! Боты вступят в игру перед началом следущего раунда."))
endif
elseif SubString(cd,0,4)=="west" then
set s=SubString(cd,4,5)
if(s=="")then
set ii=3
set zo[0]=zo[0]+1
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(Lr[1]+" добавил бота к "+Ji[0]+". Боты вступят в игру перед началом следущего раунда."))
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"Number of bots to be added: "+Ji[0]+": "+pi+I2S(zo[0])+"|r, "+Ji[1]+": "+pi+I2S(zo[1])+"|r")
elseif KA(s)or s=="0" then
set zo[0]=S2I(s)
set ii=3
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(Lr[1]+" добавил к "+Ji[0]+" "+pi+s+"|r ботов. Боты вступят в игру перед началом следущего раунда."))
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"Количество добавленных ботов: "+Ji[0]+": "+pi+I2S(zo[0])+"|r, "+Ji[1]+": "+pi+I2S(zo[1])+"|r")
endif
elseif SubString(cd,0,4)=="east" then
set s=SubString(cd,4,5)
if(s=="")then
set ii=3
set zo[1]=zo[1]+1
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(Lr[1]+" добавил бота к "+Ji[1]+". Боты вступят в игру перед началом следущего раунда."))
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"Количество добавленных ботов: "+Ji[0]+": "+pi+I2S(zo[0])+"|r, "+Ji[1]+": "+pi+I2S(zo[1])+"|r")
elseif KA(s)or s=="0" then
set zo[1]=S2I(s)
set ii=3
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(Lr[1]+" установил количество добавленных ботов на "+Ji[1]+" to "+pi+s+"|r. Боты вступят в игру перед началом следущего раунда."))
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"Количество добавленных ботов: "+Ji[0]+": "+pi+I2S(zo[0])+"|r, "+Ji[1]+": "+pi+I2S(zo[1])+"|r")
endif
elseif SubString(cd,0,2)=="xr" then
call rd(SubString(cd,2,3))
elseif ir then
return
elseif SubString(cd,0,2)=="mp" then
call Nd(SubString(cd,2,3))
elseif(cd=="dom")then
call TriggerExecute(pV)
elseif(cd=="dr")then
call TriggerExecute(UV)
elseif(cd=="pause")then
call DisableTrigger(Bn)
call DisplayTimedTextToPlayer(Player(0),0,0,20,"|cffFF0000Игра НЕ начнется через 20 секунд. Напишите -skip чтобы начать игру!|r")
elseif SubString(cd,0,1)=="m" then
if TC(s)then
set Ca=2
call TriggerExecute(In)
endif
elseif SubString(cd,0,1)=="p" then
if TC(s)then
set Ca=1
call TriggerExecute(In)
endif
elseif SubString(cd,0,1)=="r" then
if TC(s)then
set Ca=0
call TriggerExecute(In)
endif
elseif SubString(cd,0,1)=="d" then
if TC(s)then
set Ca=3
set oi=true
call TriggerExecute(In)
endif
elseif(cd=="sm")then
call TriggerExecute(ZV)
elseif(cd=="uo")then
call TriggerExecute(JV)
elseif(cd=="ns")then
call TriggerExecute(kV)
elseif(cd=="na")then
call TriggerExecute(KV)
elseif(cd=="ntb")then
call TriggerExecute(LV)
elseif(cd=="nb")then
call TriggerExecute(mV)
elseif(cd=="nt")then
call TriggerExecute(MV)
elseif(cd=="ht")then
call TriggerExecute(PV)
elseif(cd=="ni")then
call TriggerExecute(qV)
elseif(cd=="nai")then
call TriggerExecute(zV)
elseif(cd=="cc")then
call TriggerExecute(YV)
elseif(cd=="te")then
call TriggerExecute(sV)
elseif(cd=="ca")then
call TriggerExecute(lV)
elseif(cd=="co")then
call TriggerExecute(uV)
elseif(cd=="lm")then
call TriggerExecute(WV)
elseif(cd=="nafk")then
call TriggerExecute(yV)
elseif(cd=="nl")then
call TriggerExecute(QV)
elseif(cd=="nrs")then
call TriggerExecute(tV)
elseif(cd=="ur")then
call TriggerExecute(wV)
elseif(cd=="fi")then
call TriggerExecute(SV)
elseif(cd=="nuke")then
call TriggerExecute(TV)
elseif SubString(cd,0,2)=="ll" then
call wC(SubString(cd,2,8))
elseif SubString(cd,0,2)=="it" then
call WC(SubString(cd,2,5))
elseif SubString(cd,0,3)=="fow" then
call vd(SubString(cd,3,7))
elseif SubString(cd,0,2)=="sl" then
call yC(SubString(cd,2,3))
elseif SubString(cd,0,3)=="ban" then
call Vd(SubString(cd,3,4))
elseif(cd=="envlava")and(not Lx)then
call TriggerExecute(dE)
set Lx=true
elseif(cd=="envice")and(not Lx)then
call TriggerExecute(cE)
set Lx=true
elseif(cd=="skip")then
set ai=true
endif
endfunction
function Cd takes string dd,string Dd returns integer
local integer i=0
if(StringLength(dd)>=StringLength(Dd))then
loop
exitwhen i>(StringLength(dd)-StringLength(Dd))
if(SubString(dd,i,i+StringLength(Dd))==Dd)then
return i
endif
set i=i+1
endloop
endif
return-1
endfunction
function fd takes string Fd returns nothing
local string gd=Fd
local string Gd
local integer i
local integer j
loop
set i=Cd(gd,"-")
exitwhen i==-1
set gd=SubString(gd,i+1,StringLength(gd))
set i=Cd(gd,"-")
set j=Cd(gd," ")
if(i==-1)then
set i=1000
endif
if(j==-1)then
set j=1000
endif
if(i!=1000)or(j!=1000)then
set Gd=SubString(gd,0,IMinBJ(i,j))
set gd=SubString(gd,IMinBJ(i,j),StringLength(gd))
else
set Gd=gd
endif
if(Gd!="")then
call Bd(Gd)
endif
endloop
if ai and not ir then
call TriggerExecute(Bn)
endif
endfunction
function hd takes nothing returns nothing
call fd(GetEventPlayerChatString())
endfunction
function Hd takes nothing returns boolean
return GetUnitTypeId(GetSellingUnit())=='h033'
endfunction
function jd takes nothing returns nothing
local player p=GetOwningPlayer(GetSellingUnit())
local unit u
local integer i
call GroupRemoveUnit(Do[Fi[(1+GetPlayerId(GetOwningPlayer(GetSellingUnit())))]],GetSellingUnit())
call RemoveUnit(GetSellingUnit())
if not Bi then
call RemoveUnit(GetSoldUnit())
return
endif
if GetLocalPlayer()==p then
call TimerDialogDisplay(Tr,false)
endif
if GetUnitTypeId(GetSoldUnit())=='h03H' then
call RemoveUnit(GetSoldUnit())
set i=rA(p)
call AdjustPlayerStateBJ(R2I(CF_Start*0.3),p,PLAYER_STATE_RESOURCE_GOLD)
call DisplayTimedTextToPlayer(p,0,0,8.,"|cffFFFF00+30% золота|r за случайную расу!")
if Ca==3 then
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,40,Lr[(1+GetPlayerId(p))]+" выбрал наугад |cffFFFF00"+Go[i]+"|r")
endif
else
call SetUnitOwner(GetSoldUnit(),p,true)
call xA(GetSoldUnit())
if Ca==3 then
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,40,Lr[(1+GetPlayerId(p))]+" выбрал |cffFFFF00"+Go[GetUnitPointValue(GetSoldUnit())]+"|r")
endif
endif
endfunction
function Jd takes nothing returns boolean
return GetUnitTypeId(GetSellingUnit())=='h09W'
endfunction
function kd takes nothing returns nothing
local player p=GetOwningPlayer(GetSellingUnit())
local unit u
local integer i
call GroupRemoveUnit(Do[Fi[(1+GetPlayerId(GetOwningPlayer(GetSellingUnit())))]],GetSellingUnit())
call RemoveUnit(GetSellingUnit())
if not Bi then
call RemoveUnit(GetSoldUnit())
return
endif
if GetUnitTypeId(GetSoldUnit())=='h03H' then
set i=vA(p)
call WI(i,-1)
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,Lr[(1+GetPlayerId(p))]+" забанил наугад |cffFFFF00"+Go[i]+"|r")
else
call WI(GetUnitPointValue(GetSoldUnit()),-1)
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,Lr[(1+GetPlayerId(p))]+" забанил |cffFFFF00"+Go[GetUnitPointValue(GetSoldUnit())]+"|r")
endif
call RemoveUnit(GetSoldUnit())
endfunction
function Kd takes nothing returns boolean
return(Ux)
endfunction
function CF_MenuFogClick takes nothing returns nothing
if GetClickedButton()==CF_BtnF1 then
set CF_MenuF=1
else
set CF_MenuF=0
endif
endfunction
function CF_MenuCoinClick takes nothing returns nothing
if GetClickedButton()==CF_BtnC2 then
set CF_MenuC=2
elseif GetClickedButton()==CF_BtnC1 then
set CF_MenuC=1
else
set CF_MenuC=0
endif
endfunction
function CF_MenuFill takes nothing returns nothing
call DialogClear(CF_DlgF)
call DialogSetMessage(CF_DlgF,"Туман войны на всю игру?")
call DialogAddButtonBJ(CF_DlgF,"Без тумана")
set CF_BtnF0=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgF,"Туман войны")
set CF_BtnF1=bj_lastCreatedButton
call DialogClear(CF_DlgC)
call DialogSetMessage(CF_DlgC,"Монетки?")
call DialogAddButtonBJ(CF_DlgC,"Без монеток")
set CF_BtnC0=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgC,"Монетки (каждые 40 с)")
set CF_BtnC1=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgC,"Бешеные монетки (по 10)")
set CF_BtnC2=bj_lastCreatedButton
call DialogClear(CF_DlgG)
call DialogSetMessage(CF_DlgG,"Стартовый бюджет (золото в начале каждого раунда)")
call DialogAddButtonBJ(CF_DlgG,"250 (стандарт)")
set CF_BtnG[0]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgG,"500")
set CF_BtnG[1]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgG,"750")
set CF_BtnG[2]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgG,"1000")
set CF_BtnG[3]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgG,"1500")
set CF_BtnG[4]=bj_lastCreatedButton
call DialogClear(CF_DlgB)
call DialogSetMessage(CF_DlgB,"Боты в команде противника")
call DialogAddButtonBJ(CF_DlgB,"Без ботов")
set CF_BtnB[0]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgB,"1 бот")
set CF_BtnB[1]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgB,"2 бота")
set CF_BtnB[2]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgB,"3 бота")
set CF_BtnB[3]=bj_lastCreatedButton
call DialogClear(CF_DlgA)
call DialogSetMessage(CF_DlgA,"Боты в вашей команде")
call DialogAddButtonBJ(CF_DlgA,"Без ботов")
set CF_BtnA[0]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgA,"1 бот")
set CF_BtnA[1]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgA,"2 бота")
set CF_BtnA[2]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgA,"3 бота")
set CF_BtnA[3]=bj_lastCreatedButton
call DialogClear(CF_DlgD)
call DialogSetMessage(CF_DlgD,"Сила ботов (бонус к доходу и урону)")
call DialogAddButtonBJ(CF_DlgD,"Обычные (0%)")
set CF_BtnD[0]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgD,"Сильные (+15%)")
set CF_BtnD[1]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgD,"Очень сильные (+30%)")
set CF_BtnD[2]=bj_lastCreatedButton
call DialogAddButtonBJ(CF_DlgD,"Безумные (+80%)")
set CF_BtnD[3]=bj_lastCreatedButton
endfunction
function CF_MenuBotsClick takes nothing returns nothing
local integer cf_i=0
loop
exitwhen cf_i>3
if GetClickedButton()==CF_BtnB[cf_i] then
set CF_MenuB=cf_i
endif
if GetClickedButton()==CF_BtnA[cf_i] then
set CF_MenuA=cf_i
endif
if GetClickedButton()==CF_BtnD[cf_i] then
set CF_MenuD=cf_i
endif
set cf_i=cf_i+1
endloop
endfunction
function CF_MenuGoldClick takes nothing returns nothing
local integer cf_i=0
loop
exitwhen cf_i>4
if GetClickedButton()==CF_BtnG[cf_i] then
set CF_MenuG=cf_i
endif
set cf_i=cf_i+1
endloop
endfunction
// меню хозяина (красный игрок) перед выбором режима: туман войны, монетки, стартовый бюджет; туман и монетки = команды -fow и -co / -cc
function CF_Menu takes nothing returns nothing
local real cf_w=0.
local integer cf_i=1
local boolean cf_any=false
if not CF_MenuOn or GetPlayerSlotState(Player(0))!=PLAYER_SLOT_STATE_PLAYING or GetPlayerController(Player(0))!=MAP_CONTROL_USER then
set CF_MenuDone=true
return
endif
call CF_MenuFill()
if jx==0 then
set CF_MenuF=-1
call DialogDisplay(Player(0),CF_DlgF,true)
loop
exitwhen CF_MenuF>=0 or cf_w>=45.
call TriggerSleepAction(.25)
set cf_w=cf_w+.25
endloop
call DialogDisplay(Player(0),CF_DlgF,false)
endif
set cf_w=0.
if uo==0 then
set CF_MenuC=-1
call DialogDisplay(Player(0),CF_DlgC,true)
loop
exitwhen CF_MenuC>=0 or cf_w>=45.
call TriggerSleepAction(.25)
set cf_w=cf_w+.25
endloop
call DialogDisplay(Player(0),CF_DlgC,false)
endif
set cf_w=0.
set CF_MenuG=-1
call DialogDisplay(Player(0),CF_DlgG,true)
loop
exitwhen CF_MenuG>=0 or cf_w>=45.
call TriggerSleepAction(.25)
set cf_w=cf_w+.25
endloop
call DialogDisplay(Player(0),CF_DlgG,false)
set cf_w=0.
set CF_MenuB=-1
call DialogDisplay(Player(0),CF_DlgB,true)
loop
exitwhen CF_MenuB>=0 or cf_w>=45.
call TriggerSleepAction(.25)
set cf_w=cf_w+.25
endloop
call DialogDisplay(Player(0),CF_DlgB,false)
set cf_w=0.
set CF_MenuA=-1
call DialogDisplay(Player(0),CF_DlgA,true)
loop
exitwhen CF_MenuA>=0 or cf_w>=45.
call TriggerSleepAction(.25)
set cf_w=cf_w+.25
endloop
call DialogDisplay(Player(0),CF_DlgA,false)
// боты: счётчики оригинала (zo по командам, ii=3 добавляет перед первым раундом), тот же путь, что у команд -east и -west
if CF_MenuB>0 then
set zo[1-Fi[1]]=CF_MenuB
set ii=3
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,8.,"|cffFFFF00Боты у противника: "+I2S(CF_MenuB)+"|r")
endif
if CF_MenuA>0 then
set zo[Fi[1]]=CF_MenuA
set ii=3
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,8.,"|cffFFFF00Боты в вашей команде: "+I2S(CF_MenuA)+"|r")
endif
// боты из слотов Computer лобби тоже получают силу из меню (se[] уже выставлен при старте карты)
loop
exitwhen cf_i>12
if se[cf_i] then
set cf_any=true
endif
set cf_i=cf_i+1
endloop
if CF_MenuB>0 or CF_MenuA>0 or cf_any then
set cf_w=0.
set CF_MenuD=-1
call DialogDisplay(Player(0),CF_DlgD,true)
loop
exitwhen CF_MenuD>=0 or cf_w>=45.
call TriggerSleepAction(.25)
set cf_w=cf_w+.25
endloop
call DialogDisplay(Player(0),CF_DlgD,false)
// без выбора (45 с) боты получают высшую силу
if CF_MenuD<0 then
set CF_MenuD=3
endif
if CF_MenuD==1 then
set CF_BD=15
elseif CF_MenuD==2 then
set CF_BD=30
elseif CF_MenuD==3 then
set CF_BD=80
endif
if CF_BD>0 then
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,8.,"|cffFFFF00Сила ботов: +"+I2S(CF_BD)+"% к доходу и урону|r")
endif
endif
if CF_MenuG==1 then
set CF_Start=500
elseif CF_MenuG==2 then
set CF_Start=750
elseif CF_MenuG==3 then
set CF_Start=1000
elseif CF_MenuG==4 then
set CF_Start=1500
endif
if CF_Start!=250 then
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,8.,"|cffFFFF00Стартовый бюджет: "+I2S(CF_Start)+" золота|r")
endif
if CF_MenuF==1 and jx==0 then
call vd("")
endif
if CF_MenuC==1 and uo==0 then
call TriggerExecute(uV)
elseif CF_MenuC==2 and uo==0 then
call TriggerExecute(YV)
endif
set CF_MenuDone=true
endfunction
function CF_MenuStart takes nothing returns nothing
call CF_Menu()
endfunction
function ld takes nothing returns nothing
set ir=true
call DisableTrigger(GetTriggeringTrigger())
// меню запускается на 2-й секунде игры, здесь только ждём его конец (не дольше 60 с)
set CF_MW=0.
loop
exitwhen CF_MenuDone or CF_MW>=240.
call TriggerSleepAction(.25)
set CF_MW=CF_MW+.25
endloop
if(Kd())then
set Mr=1
call TriggerExecute(Rn)
else
call DialogSetMessage(po[0],"Выберите количество побед для выигрыша!")
call DialogAddButtonBJ(po[0],"1")
set Wi[4]=bj_lastCreatedButton
call DialogAddButtonBJ(po[0],"2")
set Wi[5]=bj_lastCreatedButton
call DialogAddButtonBJ(po[0],"3")
set Wi[6]=bj_lastCreatedButton
call DialogAddButtonBJ(po[0],"4")
set Wi[7]=bj_lastCreatedButton
call DialogDisplayBJ(true,po[0],Player(0))
endif
endfunction
function Ld takes nothing returns boolean
return(GetClickedButton()==Wi[7])
endfunction
function md takes nothing returns boolean
return(GetClickedButton()==Wi[6])
endfunction
function Md takes nothing returns boolean
return(GetClickedButton()==Wi[5])
endfunction
function pd takes nothing returns boolean
return(GetClickedButton()==Wi[4])
endfunction
function Pd takes nothing returns nothing
if(pd())then
set Wx=1
call TriggerExecute(Dn)
else
if(Md())then
set Wx=2
call TriggerExecute(Cn)
else
if(md())then
set Wx=3
call TriggerExecute(Cn)
else
if(Ld())then
set Wx=4
call TriggerExecute(Cn)
endif
endif
endif
endif
endfunction
function qd takes nothing returns nothing
call DialogSetMessage(po[1],"Новые расы после каждого раунда?")
call DialogAddButtonBJ(po[1],"Да")
set Wi[8]=bj_lastCreatedButton
call DialogAddButtonBJ(po[1],"Нет")
set Wi[9]=bj_lastCreatedButton
call DialogDisplayBJ(true,po[1],Player(0))
endfunction
function Qd takes nothing returns boolean
return(GetClickedButton()==Wi[9])
endfunction
function sd takes nothing returns boolean
return(GetClickedButton()==Wi[8])
endfunction
function Sd takes nothing returns nothing
if(sd())then
set Yi=true
else
if(Qd())then
set Yi=false
endif
endif
call TriggerExecute(Dn)
endfunction
function td takes nothing returns nothing
call DialogSetMessage(po[2],"Способ получения рас?")
call DialogAddButtonBJ(po[2],"Выбор рас!")
set Wi[10]=bj_lastCreatedButton
call DialogAddButtonBJ(po[2],"Раса наугад!")
set Wi[11]=bj_lastCreatedButton
call DialogDisplayBJ(true,po[2],Player(0))
endfunction
function Td takes nothing returns boolean
return(GetClickedButton()==Wi[11])
endfunction
function ud takes nothing returns boolean
return(GetClickedButton()==Wi[10])
endfunction
function Ud takes nothing returns nothing
if(ud())then
set Ca=1
else
if(Td())then
set Ca=0
endif
endif
call TriggerExecute(In)
call TriggerSleepAction(3.)
set Mr=1
call TriggerExecute(Rn)
endfunction
function wd takes nothing returns nothing
set gE=false
call FogEnable(false)
endfunction
function Wd takes nothing returns boolean
return(IsUnitType(GetTriggerUnit(),UNIT_TYPE_FLYING)==false)and((1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))<=12)and(GetUnitPointValue(GetEnteringUnit())!=129)
endfunction
function yd takes nothing returns nothing
call Qb(0,GetEnteringUnit())
endfunction
function Yd takes nothing returns boolean
return(IsUnitType(GetTriggerUnit(),UNIT_TYPE_FLYING)==false)and((1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))<=12)and(GetUnitPointValue(GetEnteringUnit())!=129)
endfunction
function zd takes nothing returns nothing
call Qb(0,GetLeavingUnit())
endfunction
function Zd takes nothing returns boolean
return(IsUnitType(GetTriggerUnit(),UNIT_TYPE_FLYING)==false)and((1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))<=12)and(GetUnitPointValue(GetEnteringUnit())!=129)
endfunction
function vD takes nothing returns nothing
call Qb(1,GetEnteringUnit())
endfunction
function eD takes nothing returns boolean
return(IsUnitType(GetTriggerUnit(),UNIT_TYPE_FLYING)==false)and((1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))<=12)and(GetUnitPointValue(GetEnteringUnit())!=129)
endfunction
function xD takes nothing returns nothing
call Qb(1,GetLeavingUnit())
endfunction
function oD takes nothing returns nothing
call kb(ar,5,3,mA())
endfunction
function rD takes nothing returns nothing
if GetUnitTypeId(GetEnumUnit())!='hcas' then
set mr=ForcePickRandomPlayer(wo[Fi[(1+GetPlayerId(GetTriggerPlayer()))]])
set Nr[(1+GetPlayerId(mr))]=(Nr[(1+GetPlayerId(mr))]+1)
call SetUnitOwner(GetEnumUnit(),mr,true)
if IsUnitType(GetEnumUnit(),UNIT_TYPE_STRUCTURE)then
call GroupAddUnit(va,GetEnumUnit())
call IssueImmediateOrderById(GetEnumUnit(),lx[GetUnitPointValue(GetEnumUnit())])
call IssueImmediateOrderById(GetEnumUnit(),lx[GetUnitPointValue(GetEnumUnit())])
endif
endif
endfunction
function iD takes nothing returns nothing
call AdjustPlayerStateBJ(Mi,GetEnumPlayer(),PLAYER_STATE_RESOURCE_GOLD)
call DisplayTextToPlayer(GetEnumPlayer(),0,0,(("Вы получили |cffFFFF00"+I2S(Mi))+(("|r золота и |cffFFFF00"+I2S(Nr[(1+GetPlayerId(GetEnumPlayer()))]))+("|r юнитов от "+Lr[(1+GetPlayerId(GetTriggerPlayer()))]))))
endfunction
function aD takes nothing returns nothing
local integer i=1
local integer id=(1+GetPlayerId(GetTriggerPlayer()))
local integer yI=Fi[id]
set qr=qr-1
set Pr[id]=false
set di[id]=false
call ForceRemovePlayer(wo[yI],GetTriggerPlayer())
call ForceRemovePlayer(Ba,GetTriggerPlayer())
set Zi[yI]=(Zi[yI]-1)
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(Lr[id]+"|cffCA0000 покинул игру!|r"))
if(id!=6 and id!=12)then
loop
exitwhen i>12
set Nr[bj_forLoopAIndex]=0
set i=i+1
endloop
set Mi=(GetPlayerState(GetTriggerPlayer(),PLAYER_STATE_RESOURCE_GOLD)/ Zi[yI])
call ForGroup(NR(GetTriggerPlayer()),function rD)
call ForForce(wo[yI],function iD)
call DI()
endif
endfunction
function nD takes nothing returns boolean
return GetItemTypeId(GetManipulatedItem())=='I000'
endfunction
function VD takes nothing returns nothing
if GetOwningPlayer(GetTriggerUnit())!=GetEnumPlayer()then
call DisplayTextToPlayer(GetEnumPlayer(),0,0,(Lr[D]+" collected the coin!"))
endif
endfunction
function ED takes nothing returns nothing
local integer lb
local effect e
call RemoveItem(GetManipulatedItem())
set D=(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))
set lb=R2I((I2R(Kx[D])+4.)*.25*(8.+ba))
set yr[D]=yr[D]+1
set Zo[D]=Zo[D]+lb
call DisplayTextToPlayer(GetOwningPlayer(GetTriggerUnit()),0,0,"|cffFFFF80Вы подобрали |cffFFFF00"+I2S(lb)+"|cffFFFF80 золота!|r")
if ri[Fi[D]]==D then
set Jx[D]=Jx[D]+1
else
set Jx[D]=1
endif
set nr[Fi[D]]=true
set ri[Fi[D]]=D
if Jx[D]==3 then
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(Lr[D]+(("|cffFFFF80 подобрал |cffFFFF003|cffFFFF80 монеток подряд за "+Ji[Fi[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]])+"|cffFFFF00! Очень мило!")))
elseif Jx[D]==5 then
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(Lr[D]+(("|cffFFFF80 подобрал|cffFFFF00 5|cffFFFF80 монеток подряд за "+Ji[Fi[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]])+"|cffFFFF00! Впечатляет!")))
elseif Jx[D]==10 then
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(Lr[D]+(("|cffFFFF80 подобрал|cffFFFF00 10|cffFFFF80 монеток подряд за "+Ji[Fi[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]])+"|cffFFFF00! ЖАДИНА!")))
else
call ForForce(wo[Fi[D]],function VD)
endif
call AdjustPlayerStateBJ(lb,GetOwningPlayer(GetTriggerUnit()),PLAYER_STATE_RESOURCE_GOLD)
set e=AddSpecialEffectTarget("Abilities\\Spells\\Other\\Transmute\\PileofGold.mdl",GetTriggerUnit(),"origin")
call DestroyEffect(e)
set e=null
call PlaySoundOnUnitBJ(rn,'d',GetTriggerUnit())
set wx[Fi[D]]=wx[Fi[D]]+1
call kb(ar,2,Xa[Fi[D]]-1,I2S(wx[Fi[D]]))
endfunction
function XD takes nothing returns boolean
return(IsUnitType(GetEnteringUnit(),UNIT_TYPE_PEON)!=null)
endfunction
function OD takes nothing returns nothing
call PingMinimapForPlayer(GetOwningPlayer(GetEnteringUnit()),GetUnitX(GetEnteringUnit()),GetUnitY(GetEnteringUnit()),1)
call SetUnitPosition(GetEnteringUnit(),GetPlayerStartLocationX(GetOwningPlayer(GetEnteringUnit())),GetPlayerStartLocationY(GetOwningPlayer(GetEnteringUnit())))
call DisplayTextToPlayer(GetOwningPlayer(GetEnteringUnit()),0,0,"|cffFF0000Ваш рабочий не может покидать замок!|r")
endfunction
function RD takes nothing returns nothing
call ExecuteFunc("qc")
call TriggerExecute(aE)
call TriggerSleepAction(10.)
call TriggerExecute(Rn)
endfunction
function ID takes nothing returns boolean
return GetUnitTypeId(GetDyingUnit())=='hcas'
endfunction
function AD takes nothing returns nothing
call ExecuteFunc("qc")
set Ia=1+GetPlayerId(GetOwningPlayer(GetKillingUnit()))
set I=1-Fi[1+GetPlayerId(GetOwningPlayer(GetDyingUnit()))]
set ia[I]=ia[I]+1
call kb(ar,5,Xa[I]-1,I2S(ia[I]))
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(Ji[I]+" побеждают в этом раунде!"))
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,((("Счёт таков: |cffFF0000Запад|r: |cffFFCC00"+I2S(ia[0]))+(" |cff00FF00Восток|r:|cffFFCC00 "+I2S(ia[1])))+("|r. Количество побед для выигрыша: |cffFFCC00"+(I2S(Wx)+"|r"))))
if ia[I]>=Wx then
set ni=true
set GE=I
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(("|cffFFFF00Поздравляем! "+Ji[I])+"|cffFFFF00 выигрывают матч! Игра закончится через минуту.|r"))
call DestroyTimer(si)
call TriggerExecute(aE)
call TriggerSleepAction(15.)
call ForGroup(ER(bj_mapInitialPlayableArea),function nc)
call TriggerSleepAction(45.)
set I=0
loop
exitwhen I>11
if Fi[I+1]==GE then
call CustomVictoryBJ(Player(I),true,true)
else
call CustomDefeatBJ(Player(I),"Вы были побеждены!")
endif
set I=I+1
endloop
else
call TriggerExecute(aE)
call TriggerSleepAction(15.)
set Mr=Mr+1
call TriggerExecute(Rn)
endif
endfunction
function ND takes nothing returns boolean
return not IsPlayerInForce(GetTriggerPlayer(),Xi)
endfunction
function Trig_First_Building_Func007C takes nothing returns boolean
return(Aa>=4)
endfunction
function bD takes nothing returns nothing
local integer lb
set Aa=Aa+1
set lb=(5-Aa)*5
set Ko[(1+GetPlayerId(GetTriggerPlayer()))]=(Ko[(1+GetPlayerId(GetTriggerPlayer()))]+lb)
call AdjustPlayerStateBJ(lb,GetTriggerPlayer(),PLAYER_STATE_RESOURCE_GOLD)
call DisplayTextToPlayer(GetTriggerPlayer(),0,0,(("|cffFFFF80Вы получаете |cffFFCC00"+I2S(lb))+("|cffFFFF80 золота за то, что вы - "+(Ui[Aa]+" игрок, закончивший постройку!"))))
if Aa>=4 then
call DisableTrigger(GetTriggeringTrigger())
else
call ForceAddPlayer(Xi,GetTriggerPlayer())
endif
endfunction
function BD takes nothing returns boolean
return(GetIssuedOrderId()==851971)
endfunction
function cD takes nothing returns nothing
local location l=GetRandomLocInRect(Mx[Fi[(1+GetPlayerId(GetOwningPlayer(GetOrderedUnit())))]])
call IssuePointOrderByIdLoc(GetOrderedUnit(),851984,l)
call RemoveLocation(l)
set l=null
endfunction
function CD takes unit u returns nothing
local integer i=(Fi[GetPlayerId(GetOwningPlayer((u)))+1])*4096+GetUnitUserData(u)
set Yo[i]=Yo[i]+1
endfunction
function dD takes nothing returns nothing
if IsUnitType(GetTriggerUnit(),UNIT_TYPE_SAPPER)then
call CD(GetOrderedUnit())
call pA(GetOrderedUnit())
if GetUnitAbilityLevel(GetOrderedUnit(),'A08X')==1 then
call aN(Z,GetOrderedUnit(),GetOrderedUnit())
endif
elseif GetUnitTypeId(GetOrderedUnit())=='h001' then
call cD()
elseif GetUnitTypeId(GetOrderedUnit())=='h00N' then
set yo=(nA(iO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetOrderedUnit()))))+1]))])]))
call IssueTargetOrderById(GetOrderedUnit(),851983,yo)
endif
endfunction
function DD takes nothing returns boolean
return(GetSpellAbilityId()=='A005')
endfunction
function fD takes nothing returns nothing
local integer i=(1+GetPlayerId(GetOwningPlayer(GetEventDamageSource())))
set Si[i]=Si[i]+R2I(GetUnitState(GetTriggerUnit(),UNIT_STATE_LIFE))
set so[i]=so[i]+1
endfunction
function FD takes nothing returns nothing
local location l=GetSpellTargetLoc()
local integer yI=Fi[(1+GetPlayerId(GetTriggerPlayer()))]
local integer gD=(1+GetPlayerId(GetTriggerPlayer()))
local unit u=CreateUnitAtLoc(GetOwningPlayer(GetTriggerUnit()),'h04X',l,0)
local unit GD=GetTriggerUnit()
local trigger hD=CreateTrigger()
local group HD=CreateGroup()
call SetUnitVertexColorBJ(u,.0,.0,.0,100.)
call DestroyEffect(AddSpecialEffectTarget("Units\\NightElf\\Wisp\\WispExplode.mdl",u,"origin"))
call DestroyEffect(AddSpecialEffectTarget("Units\\NightElf\\Wisp\\WispExplode.mdl",u,"origin"))
call DestroyEffect(AddSpecialEffectTarget("Units\\NightElf\\Wisp\\WispExplode.mdl",u,"origin"))
call DestroyEffect(AddSpecialEffectTarget("Abilities\\Spells\\Items\\TomeOfRetraining\\TomeOfRetrainingCaster.mdl",GetTriggerUnit(),"origin"))
call UnitRemoveAbility(GetTriggerUnit(),'A005')
call UnitRemoveAbility(GetTriggerUnit(),'A06E')
set zi[yI]=zi[yI]-1
if zi[yI]==0 then
call kb(ar,1,Xa[yI]-1,"|cffFF00000|r")
else
call kb(ar,1,Xa[yI]-1,I2S(zi[yI]))
endif
call TriggerSleepAction(.35)
call TriggerAddCondition(hD,Av)
call TriggerAddAction(hD,function fD)
set av=GD
call GroupEnumUnitsInRangeOfLoc(HD,l,1200,Ev)
loop
set GD=FirstOfGroup(HD)
exitwhen GD==null
call GroupRemoveUnit(HD,GD)
call TriggerRegisterUnitEvent(hD,GD,EVENT_UNIT_DAMAGED)
if GetUnitAbilityLevel(GD,'B012')>0 then
call UnitRemoveAbility(GD,'B012')
endif
endloop
call IssueImmediateOrderById(u,852526)
call TriggerSleepAction(1.5)
if so[gD]==0 then
call DisplayTextToForce(Ba,Lr[gD]+" тратит свой Спасительный Удар, не убив ни одного юнита! Эпик Фейл! ОЛОЛО!")
elseif so[gD]==1 then
call DisplayTextToForce(Ba,Lr[gD]+" тратит свой Спасительный Удар, убивая всего одного беднягу-юнита!")
elseif so[gD]<5 then
call DisplayTextToForce(Ba,Lr[gD]+" тратит свой Спасительный Удар, наносит всего-лишь |cffFFFF00"+I2S(Si[gD])+"|r урона, убив |cffFFFF00"+I2S(so[gD])+"|r юнитов!")
else
call DisplayTextToForce(Ba,Lr[gD]+" нанёс |cffFFFF00"+I2S(Si[gD])+"|r урона своим Спасительным Ударом, убивая |cffFFFF00"+I2S(so[gD])+"|r юнитов!")
endif
call DestroyTrigger(hD)
set hD=null
call RemoveLocation(l)
set l=null
call DestroyGroup(HD)
set HD=null
call RemoveUnit(u)
endfunction
function jD takes nothing returns boolean
return GetOwningPlayer(GetAttacker())!=Player(PLAYER_NEUTRAL_AGGRESSIVE)and GetOwningPlayer(GetTriggerUnit())!=Player(PLAYER_NEUTRAL_AGGRESSIVE)and Fi[(1+GetPlayerId(GetOwningPlayer(GetAttacker())))]==Fi[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]
endfunction
function JD takes nothing returns nothing
if GetUnitLifePercent(GetTriggerUnit())>=20. then
call IssueImmediateOrderById(GetAttacker(),851972)
endif
endfunction
function kD takes unit u returns boolean
return(GetUnitTypeId(u)=='n00V')or(GetUnitTypeId(u)=='n01O')
endfunction
function KD takes unit u returns boolean
return((GetUnitTypeId(u)=='h01U')or(GetUnitTypeId(u)=='h05H'))and(IsUnitType(GetTriggerUnit(),UNIT_TYPE_UNDEAD)==false)and(IsUnitType(GetTriggerUnit(),UNIT_TYPE_MECHANICAL)==false)and(GetUnitAbilityLevelSwapped('A07G',GetTriggerUnit())==0)
endfunction
function lD takes nothing returns nothing
local unit u=Po
local unit LD=GetTriggerUnit()
if(GetUnitPointValue(u)==129)then
call pA(u)
elseif(kD(u))then
call IssueImmediateOrderById(u,852100)
call pA(u)
elseif(KD(u))then
if(GetUnitTypeId(u)=='h01U')then
call Ac('h01V',LD,u,GetOwningPlayer(u))
else
call Ac('h01U',LD,u,GetOwningPlayer(u))
endif
call XB("Abilities\\Spells\\Items\\AIam\\AIamTarget.mdl",bj_lastCreatedUnit)
call RemoveUnit(LD)
elseif(GetUnitPointValue(u)==128)then
if(GetUnitTypeId(u)=='e00B')then
call SetUnitLifePercentBJ(u,(GetUnitLifePercent(u)+14.))
else
call SetUnitLifePercentBJ(u,(GetUnitLifePercent(u)+20.))
endif
endif
endfunction
function mD takes nothing returns nothing
local unit u=Po
local unit LD=GetTriggerUnit()
if(GetUnitTypeId(LD)=='e00A' and not IsUnitType(u,UNIT_TYPE_STRUCTURE))then
call UnitDamageTargetBJ(LD,u,350,ATTACK_TYPE_CHAOS,DAMAGE_TYPE_NORMAL)
endif
endfunction
function MD takes unit pD returns unit
local unit u=(nA(iO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((pD))))+1]))])]))
local unit u2=null
local unit u3=null
local integer i=0
if(u==null)then
return null
endif
loop
exitwhen i>4
set i=i+1
if GetUnitAbilityLevel(u,'B012')==0 then
if not(IsUnitType(u,UNIT_TYPE_MELEE_ATTACKER))then
set u2=u
if(GetUnitState(u,UNIT_STATE_MANA)>=40.)then
return u
endif
else
if(GetUnitState(u,UNIT_STATE_MANA)>=40.)then
set u3=u
endif
if false then
return null
endif
endif
endif
set u=(nA(iO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((pD))))+1]))])]))
endloop
if(u2!=null)then
return u2
endif
if(u3!=null)then
return u3
endif
if GetUnitAbilityLevel(u,'B012')>0 then
return null
endif
return u
endfunction
function PD takes unit qD,unit rN returns nothing
call IssueTargetOrderById(qD,851983,rN)
call SaveUnitHandle(hE,0,GetHandleId(qD),rN)
endfunction
function QD takes nothing returns nothing
local unit u=Po
local unit rN
local integer s
if(GetUnitPointValue(u)==129)then
set s=GetHandleId(u)
if GetUnitAbilityLevel(u,'B012')>0 then
if HaveSavedHandle(hE,0,s)then
set rN=LoadUnitHandle(hE,0,s)
if rN==null or GetUnitX(rN)==.0 or IsUnitType(rN,UNIT_TYPE_DEAD) then
call RemoveSavedHandle(hE,0,s)
call TriggerExecute(sn)
return
endif
if not IssueTargetOrderById(u,851983,rN)then
call RemoveSavedHandle(hE,0,s)
call TriggerExecute(sn)
return
endif
else
set rN=MD(u)
if rN==null then
call IssuePointOrderById(u,851986,GetUnitX(u),GetUnitY(u))
return
endif
call PD(u,rN)
return
endif
else
if HaveSavedHandle(hE,0,s)then
set rN=LoadUnitHandle(hE,0,s)
if rN==null or GetUnitX(rN)==.0 or IsUnitType(rN,UNIT_TYPE_DEAD) then
call RemoveSavedHandle(hE,0,s)
call TriggerExecute(sn)
return
endif
call IssueTargetOrderById(u,851983,rN)
elseif(GetUnitState(u,UNIT_STATE_MANA)>=50.)then
call IssueImmediateOrderById(u,852129)
call TriggerSleepAction(.1)
set rN=MD(u)
if rN==null then
return
endif
call PD(u,rN)
call TriggerSleepAction(2)
call IssueTargetOrderById(u,851983,rN)
return
else
call MA(u)
return
endif
endif
elseif GetUnitTypeId(u)=='n01U' then
if HaveStoredReal(vr,"repairgobboX",(I2S(GetHandleId((u)))))then
set X=GetStoredReal(vr,"repairgobboX",(I2S(GetHandleId((u)))))
set Y=GetStoredReal(vr,"repairgobboY",(I2S(GetHandleId((u)))))
if RAbsBJ(X-GetUnitX(u))<300 and RAbsBJ(Y-GetUnitY(u))<300 then
call IssuePointOrderById(u,851986,GetUnitX(u),GetUnitY(u))
call FlushStoredReal(vr,"repairgobboX",(I2S(GetHandleId((u)))))
call FlushStoredReal(vr,"repairgobboY",(I2S(GetHandleId((u)))))
else
call IssuePointOrderById(u,851986,X,Y)
endif
else
call IssuePointOrderById(u,851986,GetUnitX(u),GetUnitY(u))
endif
endif
endfunction
function sD takes nothing returns boolean
return GetUnitAbilityLevel(GetAttacker(),'A03Q')==1
endfunction
function SD takes unit tD,unit GB returns nothing
local integer i=GetRandomInt(0,99)
local real TD
local location l
local effect e
if GetUnitAbilityLevel(tD,'B019')==1 then
return
endif
if(i<15)and(GetUnitAbilityLevel(GB,'A070')==0)and IsUnitType(GB,UNIT_TYPE_MECHANICAL)==false then
call TriggerSleepAction(1)
if GB==null or IsUnitType(GB,UNIT_TYPE_DEAD)then
return
endif
set TD=GetUnitState(GB,UNIT_STATE_LIFE)/ 2
call UnitDamageTarget(tD,GB,10000,true,false,ATTACK_TYPE_CHAOS,DAMAGE_TYPE_NORMAL,WEAPON_TYPE_WHOKNOWS)
call SetUnitState(tD,UNIT_STATE_LIFE,GetUnitState(tD,UNIT_STATE_LIFE)+TD)
set e=AddSpecialEffectTarget("Abilities\\Spells\\Orc\\AncestralSpirit\\AncestralSpiritCaster.mdl",GB,"chest")
call TriggerSleepAction(1.2)
call DestroyEffect(e)
set e=null
elseif(i<25)then
call TriggerSleepAction(1)
call VN(S,tD,GB)
endif
endfunction
function uD takes nothing returns nothing
local unit UD=GetAttacker()
local unit GB=GetTriggerUnit()
if GetUnitTypeId(UD)=='u00D' then
call SD(UD,GB)
elseif GetUnitTypeId(UD)=='n01V' then
call IssuePointOrderById(UD,852040,GetUnitX(UD),GetUnitY(UD))
endif
endfunction
function wD takes nothing returns nothing
call SetUnitVertexColorBJ(bj_lastCreatedUnit,'d','d','d',100.)
endfunction
function WD takes nothing returns nothing
if GetUnitAbilityLevelSwapped('A07H',GetTrainedUnit())==0 and GetRandomInt(0,99)<24 then
call Ac(GetUnitTypeId(GetTrainedUnit()),GetTrainedUnit(),GetTriggerUnit(),GetOwningPlayer(GetEnumUnit()))
call Oc(GetTriggerUnit(),bj_lastCreatedUnit)
endif
endfunction
function yD takes nothing returns nothing
local unit u=GetTrainedUnit()
local unit uB=GetTriggerUnit()
local integer i=(1+GetPlayerId(GetOwningPlayer(uB)))
set Ao[i]=(Ao[i]+1)
set i=(Fi[GetPlayerId(GetOwningPlayer((u)))+1])
set Br[i]=(Br[i]+1)
call KB(u)
call pA(u)
call Oc(uB,u)
if GetUnitAbilityLevel(u,'A07J')==1 then
call Ic(uB,u)
endif
call ForGroupBJ(Zx[i],function WD)
call TriggerSleepAction(.1)
call IssueImmediateOrderById(uB,lx[GetUnitPointValue(uB)])
call pA(u)
endfunction
function YD takes nothing returns boolean
return( not(IsUnitType(GetDyingUnit(),UNIT_TYPE_STRUCTURE)))and( not(IsUnitType(GetDyingUnit(),UNIT_TYPE_TAUREN)))and( not(IsUnitType(GetDyingUnit(),UNIT_TYPE_SAPPER)==false))
endfunction
function zD takes nothing returns nothing
local unit u
local integer i
call LB(GetTriggerUnit())
if GetDyingUnit()==null then
return
endif
if GetKillingUnit()!=null then
set u=(TA(GetKillingUnit()))
set i=(1+GetPlayerId(GetOwningPlayer(u)))
set Cr[i]=Cr[i]+1
set Ra[Fi[i]]=Ra[Fi[i]]+1
if GetUnitAbilityLevel(u,'A07K')>0 then
set Po=u
call TriggerExecute(qn)
endif
if GetUnitAbilityLevelSwapped('A07O',GetDyingUnit())>0 then
set Po=u
call TriggerExecute(Qn)
endif
endif
set i=IMinBJ(lo[Fi[(1+GetPlayerId(GetOwningPlayer(GetDyingUnit())))]],2)
if i<=0 then
return
endif
set u=GetDyingUnit()
call TriggerSleepAction(2)
if u==null then
return
endif
loop
exitwhen i<=0
if(GetRandomInt(0,99)<20)and(GetUnitAbilityLevel(u,'A07G')==0)then
if GetUnitPointValue(u)=='h' or GetUnitPointValue(u)=='i' then
call Vc(GetUnitTypeId(u),u,null,GetOwningPlayer(u))
else
call Ac(GetUnitTypeId(u),u,null,GetOwningPlayer(u))
endif
call XB("Abilities\\Spells\\Human\\Resurrect\\ResurrectCaster.mdl",u)
call RemoveUnit(u)
exitwhen true
endif
set i=i-1
endloop
endfunction
function ZD takes nothing returns nothing
local unit u=GetEnumUnit()
if GetUnitAbilityLevel(u,'Bfrz')>0 and GetRandomInt(0,99)<50 then
call UnitRemoveAbility(u,'Bfrz')
endif
if GetUnitAbilityLevel(u,'B00M')>0 and GetRandomInt(0,99)<50 then
call UnitRemoveAbility(u,'B00M')
endif
endfunction
function vf takes nothing returns nothing
local unit ef=LoadUnitHandle(jE,0,(LoadInteger(o,0,GetHandleId((GetExpiredTimer())))))
if ef==null or GetUnitPointValue(ef)!=GetUnitPointValueByType('h09T')or GetUnitState(ef,UNIT_STATE_LIFE)<.405 then
call RemoveSavedHandle(jE,0,(LoadInteger(o,0,GetHandleId((GetExpiredTimer())))))
call WR(GetExpiredTimer())
set ef=null
return
endif
call GroupEnumUnitsInRange(HE,GetUnitX(ef),GetUnitY(ef),252.,Iv)
call ForGroup(HE,function ZD)
call GroupClear(HE)
set ef=null
endfunction
function xf takes unit of returns nothing
local timer t=wR()
call UnitAddAbility(GetConstructedStructure(),'A09S')
call UnitAddAbility(GetConstructedStructure(),'A09P')
call UnitAddAbility(GetConstructedStructure(),'A09V')
call TimerStart(t,4.,true,function vf)
call SaveInteger(o,0,GetHandleId((t)),(GetHandleId(of)))
call SaveUnitHandle(jE,0,GetHandleId(of),of)
endfunction
function rf takes nothing returns nothing
local unit u=GetConstructedStructure()
local integer yI=(Fi[GetPlayerId(GetOwningPlayer((u)))+1])
set D=(1+GetPlayerId(GetOwningPlayer(u)))
set I=GetUnitPointValue(u)
if I==1000 then
return
endif
call ResetUnitAnimation(br[D])
call GroupRemoveUnit(E,u)
call TB(u)
set J=(Fi[GetPlayerId(GetOwningPlayer((u)))+1])+2*gi[I]
set uv[J]=uv[J]+1
set Ir[D]=Ir[D]+Fx[I]
set bi[Fi[D]]=bi[Fi[D]]+1
if gi[I]==2 then
set So[D]=So[D]+1
elseif gi[I]==0 then
set tr[D]=tr[D]+1
if(GetUnitAbilityLevel((u),'A06V')>0)then
else
call Db(u,Fx[I])
endif
elseif gi[I]==1 then
set tr[D]=tr[D]+1
call Db(u,Fx[I]*3/ 4)
endif
set yx[D]=yx[D]+ro[I]*I2R(Fx[I])/ 100.
call iA(oO[yI],u)
call IssueImmediateOrderById(u,lx[I])
call IssueImmediateOrderById(u,lx[I])
if GetUnitTypeId(u)=='h001' then
call GroupAddUnit(Lo,u)
set X=GetRandomReal(GetRectMinX(Mx[Fi[D]]),GetRectMaxX(Mx[Fi[D]]))
set Y=GetRandomReal(GetRectMinY(Mx[Fi[D]]),GetRectMaxY(Mx[Fi[D]]))
call IssuePointOrderById(u,851984,X,Y)
elseif GetUnitTypeId(u)=='h00N' then
call GroupAddUnit(da,u)
call IssueTargetOrderById(u,851983,(nA(iO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((u))))+1]))])])))
elseif GetUnitTypeId(u)=='h008' then
set Kx[D]=Kx[D]+1
elseif GetUnitTypeId(u)=='h059' then
set lo[Fi[D]]=lo[Fi[D]]+1
elseif GetUnitTypeId(u)=='h05G' then
call GroupAddUnit(Zx[Fi[D]],u)
elseif GetUnitTypeId(u)=='h01O' then
call UnitAddAbility(u,'A01V')
elseif GetUnitTypeId(u)=='h00G' then
call UnitAddAbility(u,'A008')
call UnitAddAbility(u,'A007')
elseif GetUnitTypeId(u)=='h05L' then
call EnableTrigger(XV)
elseif GetUnitTypeId(u)=='h09T' then
call xf(u)
endif
endfunction
function af takes nothing returns nothing
call GroupAddUnit(E,GetConstructingStructure())
endfunction
function nf takes nothing returns nothing
set Mi=(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))
set yi=(ro[GetUnitPointValue(GetTriggerUnit())]*I2R((Fx[GetUnitPointValue(GetTriggerUnit())]+ca[GetUnitPointValue(GetTriggerUnit())])))
set yx[Mi]=(yx[Mi]+(yi/ 100.))
endfunction
function Vf takes nothing returns nothing
local unit u
set D=(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))
set I=GetUnitPointValue(GetTriggerUnit())
if I>1000 then
call Nc(GetOwningPlayer(GetTriggerUnit()),I-1000)
return
endif
set Ir[D]=Ir[D]+Fx[I]
call IssueImmediateOrderById(GetTriggerUnit(),lx[I])
call IssueImmediateOrderById(GetTriggerUnit(),lx[I])
call TB(GetTriggerUnit())
set yx[D]=yx[D]+ro[I]*I2R(Fx[I])/ 100.
if gi[I]==0 then
if(GetUnitAbilityLevel((GetTriggerUnit()),'A06V')>0)then
else
call Db(GetTriggerUnit(),Fx[I])
endif
elseif gi[I]==1 then
call Db(GetTriggerUnit(),Fx[I]*3/ 4)
endif
if gi[I]==2 or'h056'==GetUnitTypeId(GetTriggerUnit())then
set u=GetTriggerUnit()
call IssueImmediateOrderById(u,852602)
call TriggerSleepAction(1.)
call IssueTargetOrderById(u,852601,GroupPickRandomUnit(Vo))
call TriggerSleepAction(45.)
call IssueTargetOrderById(u,852601,GroupPickRandomUnit(Vo))
endif
endfunction
function Ef takes nothing returns boolean
return(IsUnitType(GetDyingUnit(),UNIT_TYPE_STRUCTURE))and(GetUnitTypeId(GetDyingUnit())!='hcas')
endfunction
function Xf takes nothing returns nothing
local integer UB=GetUnitPointValue(GetDyingUnit())
local integer yI=(Fi[GetPlayerId(GetOwningPlayer((GetDyingUnit())))+1])
call GroupRemoveUnit(E,GetDyingUnit())
call MN(GetTriggerUnit())
set yI=(Fi[GetPlayerId(GetOwningPlayer((GetDyingUnit())))+1])
call VA(oO[yI],GetDyingUnit())
call GroupRemoveUnit(ix[yI],GetDyingUnit())
call GroupRemoveUnit(ax[yI],GetDyingUnit())
call GroupRemoveUnit(nx[yI],GetDyingUnit())
set J=yI+2*gi[UB]
set uv[J]=uv[J]-1
if(TA(GetKillingUnit()))!=null then
set J=(Fi[GetPlayerId(GetOwningPlayer(((TA(GetKillingUnit())))))+1])
set Gi[J]=Gi[J]+1
call kb(ar,3,Xa[J]-1,I2S(Gi[J]))
endif
set J=(1+GetPlayerId(GetOwningPlayer(GetDyingUnit())))
if not IsUnitInGroup(GetDyingUnit(),va)then
set R=ro[UB]*I2R(Fx[UB]+ca[UB])
set yx[J]=yx[J]-R/ 100.
if GetUnitTypeId(GetDyingUnit())=='h008' then
set Kx[J]=Kx[J]-1
endif
else
call GroupRemoveUnit(va,GetDyingUnit())
endif
if GetUnitTypeId(GetDyingUnit())=='h001' then
call GroupRemoveUnit(Lo,GetDyingUnit())
elseif GetUnitTypeId(GetDyingUnit())=='h00N' then
call GroupRemoveUnit(da,GetDyingUnit())
elseif GetUnitTypeId(GetDyingUnit())=='h059' then
set lo[yI]=lo[yI]-1
elseif GetUnitTypeId(GetDyingUnit())=='h05G' then
call GroupRemoveUnit(Zx[yI],GetDyingUnit())
endif
endfunction
function Of takes nothing returns boolean
return GetUnitAbilityLevel(GetConstructingStructure(),'A07E')==1
endfunction
function Rf takes nothing returns nothing
call qN(GetConstructingStructure())
endfunction
function If takes nothing returns boolean
return GetUnitAbilityLevel(GetTriggerUnit(),'A07E')==1
endfunction
function Af takes nothing returns nothing
call MN(GetTriggerUnit())
call QN(GetTriggerUnit())
endfunction
function Nf takes nothing returns nothing
call MN(GetTriggerUnit())
call qN(GetTriggerUnit())
endfunction
function bf takes nothing returns boolean
return(IsUnitType(GetTriggerUnit(),UNIT_TYPE_STRUCTURE)==false)and(IsUnitType(GetTriggerUnit(),UNIT_TYPE_SAPPER))
endfunction
function Bf takes nothing returns nothing
call lB(GetTriggerUnit(),ModuloInteger(Fi[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+1,2))
call KB(GetTriggerUnit())
if GetUnitTypeId(GetTriggerUnit())=='h03A' then
call TriggerSleepAction(.1)
call IssueImmediateOrderById(GetTriggerUnit(),852055)
call TriggerSleepAction(.1)
endif
call pA(GetTriggerUnit())
endfunction
function cf takes nothing returns boolean
return(GetUnitTypeId(GetSummoningUnit())=='h03C')
endfunction
function Cf takes nothing returns nothing
local unit u=GetSummonedUnit()
call KB(u)
if GetUnitTypeId(u)=='h03C' then
call SetUnitState(u,UNIT_STATE_MANA,30)
endif
call TriggerSleepAction(.7)
if GetUnitTypeId(u)=='h03A' then
call IssueImmediateOrderById(u,852055)
call TriggerSleepAction(.1)
endif
call pA(u)
endfunction
function df takes nothing returns boolean
return(GetUnitTypeId(GetSummonedUnit())=='n00W')
endfunction
function Df takes nothing returns nothing
call pA(GetSummonedUnit())
call KB(GetSummonedUnit())
endfunction
function ff takes nothing returns boolean
return(GetUnitTypeId(GetSummonedUnit())=='u004')
endfunction
function Ff takes nothing returns nothing
call ReplaceUnitBJ(GetSummonedUnit(),sr[GetRandomInt(0,2)],2)
call pA(bj_lastReplacedUnit)
call KB(bj_lastReplacedUnit)
set Br[(Fi[GetPlayerId(GetOwningPlayer((bj_lastReplacedUnit)))+1])]=Br[(Fi[GetPlayerId(GetOwningPlayer((bj_lastReplacedUnit)))+1])]+1
endfunction
function gf takes nothing returns boolean
return(GetUnitTypeId(GetSummonedUnit())=='u008')
endfunction
function Gf takes nothing returns nothing
call ReplaceUnitBJ(GetSummonedUnit(),sr[GetRandomInt(0,6)],2)
call pA(bj_lastReplacedUnit)
call KB(bj_lastReplacedUnit)
set Br[(Fi[GetPlayerId(GetOwningPlayer((bj_lastReplacedUnit)))+1])]=Br[(Fi[GetPlayerId(GetOwningPlayer((bj_lastReplacedUnit)))+1])]+1
endfunction
function hf takes nothing returns boolean
return(GetUnitTypeId(GetSummonedUnit())=='u00E')
endfunction
function Hf takes nothing returns nothing
local integer i=GetRandomInt(0,7)
if i==0 then
set i=7
else
set i=GetRandomInt(3,6)
endif
call ReplaceUnitBJ(GetSummonedUnit(),sr[i],2)
call pA(bj_lastReplacedUnit)
call KB(bj_lastReplacedUnit)
call UnitAddAbility(bj_lastReplacedUnit,'A088')
call UnitAddAbility(bj_lastReplacedUnit,'A089')
set Br[(Fi[GetPlayerId(GetOwningPlayer((bj_lastReplacedUnit)))+1])]=Br[(Fi[GetPlayerId(GetOwningPlayer((bj_lastReplacedUnit)))+1])]+1
endfunction
function jf takes nothing returns boolean
return(GetSpellAbilityId()=='A01Q')
endfunction
function Jf takes nothing returns nothing
local location l
local effect e
local unit u=SA()
if(u==null)then
return
endif
set l=GetUnitLoc(u)
if(GetRandomInt(0,99)<10)then
call CreateUnitAtLocSaveLast(GetOwningPlayer(GetSpellAbilityUnit()),sr[3],l,bj_UNIT_FACING)
else
call CreateUnitAtLocSaveLast(GetOwningPlayer(GetSpellAbilityUnit()),sr[GetRandomInt(0,2)],l,bj_UNIT_FACING)
endif
call pA(bj_lastCreatedUnit)
call KB(bj_lastCreatedUnit)
call RemoveLocation(l)
set l=GetUnitLoc(bj_lastCreatedUnit)
set e=AddSpecialEffectLoc("Abilities\\Spells\\Items\\AIam\\AIamTarget.mdl",l)
set Br[(Fi[GetPlayerId(GetOwningPlayer((bj_lastCreatedUnit)))+1])]=Br[(Fi[GetPlayerId(GetOwningPlayer((bj_lastCreatedUnit)))+1])]+1
call RemoveUnit(u)
call RemoveLocation(l)
call DestroyEffect(e)
set e=null
set l=null
endfunction
function kf takes nothing returns boolean
return(GetSpellAbilityId()=='A05U')
endfunction
function Kf takes nothing returns nothing
local location l
local effect e
local unit u=SA()
if(u==null)then
return
endif
set l=GetUnitLoc(u)
if(GetRandomInt(0,99)<10)then
call CreateUnitAtLocSaveLast(GetOwningPlayer(GetSpellAbilityUnit()),sr[7],l,bj_UNIT_FACING)
else
call CreateUnitAtLocSaveLast(GetOwningPlayer(GetSpellAbilityUnit()),sr[GetRandomInt(1,6)],l,bj_UNIT_FACING)
endif
call pA(bj_lastCreatedUnit)
call KB(bj_lastCreatedUnit)
call RemoveLocation(l)
set l=GetUnitLoc(bj_lastCreatedUnit)
set e=AddSpecialEffectLoc("Abilities\\Spells\\Items\\AIam\\AIamTarget.mdl",l)
set Br[(Fi[GetPlayerId(GetOwningPlayer((bj_lastCreatedUnit)))+1])]=Br[(Fi[GetPlayerId(GetOwningPlayer((bj_lastCreatedUnit)))+1])]+1
call RemoveUnit(u)
call RemoveLocation(l)
call DestroyEffect(e)
set e=null
set l=null
endfunction
function lf takes nothing returns boolean
return(GetUnitTypeId(GetEnteringUnit())=='n01P')or(GetUnitTypeId(GetEnteringUnit())=='n01Q')
endfunction
function Lf takes nothing returns boolean
return(lf())
endfunction
function mf takes nothing returns boolean
return(GetUnitTypeId(GetEnteringUnit())=='n01R')or(GetUnitTypeId(GetEnteringUnit())=='n01Q')
endfunction
function Mf takes nothing returns boolean
return(mf())
endfunction
function pf takes nothing returns nothing
if(Lf())then
call SetUnitAbilityLevelSwapped('A00C',GetEnteringUnit(),2)
endif
if(Mf())then
call KB(GetEnteringUnit())
call pA(GetEnteringUnit())
endif
endfunction
function Pf takes nothing returns boolean
return GetUnitTypeId(GetAttacker())=='h05L'
endfunction
function qf takes nothing returns nothing
if GetRandomInt(0,99)<20 then
call aN(ov,GetAttacker(),GetTriggerUnit())
endif
endfunction
function SPELL_BlueShieldGenerator takes nothing returns nothing
local unit u=(nA(xO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]))
if(u==null)then
return
endif
if GetUnitAbilityLevel(u,'A09L')>0 then
set u=(nA(xO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]))
if(u==null)then
return
endif
endif
if GetUnitAbilityLevel(u,'A09L')==0 then
call UnitAddAbility(u,'A09L')
endif
set u=GetSpellAbilityUnit()
call SetUnitAnimation(u,"death")
call TriggerSleepAction(.3)
call SetUnitAnimation(u,"stand")
endfunction
function SPELL_RedShieldGenerator takes nothing returns nothing
local unit u=(nA(xO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]))
if(u==null)then
return
endif
if GetUnitAbilityLevel(u,'A09L')>0 then
set u=(nA(xO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]))
if(u==null)then
return
endif
endif
if GetUnitAbilityLevel(u,'A09L')<=1 then
call UnitAddAbility(u,'A09L')
call SetUnitAbilityLevel(u,'A09L',2)
endif
set u=GetSpellAbilityUnit()
call SetUnitAnimation(u,"death")
call TriggerSleepAction(.3)
call SetUnitAnimation(u,"stand")
endfunction
function SPELL_CheckRange takes nothing returns nothing
local real Qf=ei[GetUnitPointValue(GetSpellAbilityUnit())]
local integer i=0
local integer OI=20+R2I((Qf-500)/ 50)
local real x
local real y
local real sf
local effect array e
loop
exitwhen i>=OI
set sf=2*bj_PI*i/ OI
set y=Sin(sf)*Qf+GetUnitY(GetTriggerUnit())
set x=Cos(sf)*Qf+GetUnitX(GetTriggerUnit())
if(Fi[GetPlayerId(GetOwningPlayer((GetTriggerUnit())))+1])==Fi[(1+GetPlayerId(GetLocalPlayer()))]then
set e[i]=AddSpecialEffect("Abilities\\Spells\\NightElf\\Barkskin\\BarkSkinTarget.mdl",x,y)
else
set e[i]=AddSpecialEffect(".mdl",x,y)
endif
set i=i+1
endloop
call TriggerSleepAction(6)
set i=0
loop
exitwhen i>=OI
call DestroyEffect(e[i])
set e[i]=null
set i=i+1
endloop
endfunction
function SPELL_ObeliskOfTheClaw takes nothing returns nothing
local unit rN=(nA(xO[((Fi[GetPlayerId(GetOwningPlayer(((GetTriggerUnit()))))+1]))]))
call XB("Abilities\\Spells\\Human\\Polymorph\\PolyMorphTarget.mdl",GetTriggerUnit())
if(rN==null)then
return
endif
if GetUnitAbilityLevel(rN,'A08C')==1 then
set rN=(nA(xO[((Fi[GetPlayerId(GetOwningPlayer(((GetTriggerUnit()))))+1]))]))
if(rN==null)then
return
endif
endif
call IB("Abilities\\Spells\\Human\\ControlMagic\\ControlMagicTarget.mdl",rN,"overhead")
call UnitAddAbility(rN,'A08C')
call UnitAddAbility(rN,'A08D')
call UnitAddAbility(rN,'A08F')
endfunction
function SPELL_SilverGlade takes nothing returns nothing
local integer yI=(Fi[GetPlayerId(GetOwningPlayer((GetTriggerUnit())))+1])
call XB("Abilities\\Spells\\Items\\TomeOfRetraining\\TomeOfRetrainingCaster.mdl",GetTriggerUnit())
call EnableTrigger(OV)
set cr[yI]=cr[yI]+1
endfunction
function Sf takes nothing returns boolean
return( not(IsUnitType(GetTriggerUnit(),UNIT_TYPE_STRUCTURE)))and( not(IsUnitType(GetTriggerUnit(),UNIT_TYPE_SAPPER)==false))and( not(GetUnitAbilityLevel(GetTriggerUnit(),'A08H')==1))
endfunction
function tf takes nothing returns nothing
local integer yI=(Fi[GetPlayerId(GetOwningPlayer((GetTriggerUnit())))+1])
if(cr[yI]>0)then
call xN(Kv,GetTriggerUnit())
set cr[yI]=cr[yI]-1
call XB("Abilities\\Spells\\Items\\AIda\\AIdaCaster.mdl",bj_lastCreatedUnit)
if(cr[0]<=0 and cr[1]<=0)then
call DisableTrigger(GetTriggeringTrigger())
endif
endif
endfunction
function SPELL_StarfallObelisk takes nothing returns nothing
local unit rN=(nA(xO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
local effect e
local fogmodifier f
local boolean b=gE
if rN==null then
return
endif
set e=AddSpecialEffect("Abilities\\Spells\\NightElf\\Starfall\\StarfallCaster.mdl",GetUnitX(GetSpellAbilityUnit()),GetUnitY(GetSpellAbilityUnit()))
if b then
set f=CreateFogModifierRadius(GetOwningPlayer(GetSpellAbilityUnit()),FOG_OF_WAR_VISIBLE,GetUnitX(rN),GetUnitY(rN),1100.,true,false)
call FogModifierStart(f)
endif
if Kr then
call oN(mv,GetSpellAbilityUnit(),rN)
else
call oN(Lv,GetSpellAbilityUnit(),rN)
endif
call TriggerSleepAction(8)
if b then
call DestroyFogModifier(f)
set f=null
endif
call DestroyEffect(e)
set e=null
endfunction
function Tf takes nothing returns nothing
local timer t=GetExpiredTimer()
local integer s=GetHandleId(t)
local unit u=LoadUnitHandle(JE,s,1)
local integer i=LoadInteger(JE,s,0)
local real nR=GetUnitFacing(u)
local location l=GetUnitLoc(u)
if not hx then
call FlushChildHashtable(JE,s)
call DestroyTimer(t)
call RemoveUnit(u)
elseif i<1 then
call FlushChildHashtable(JE,s)
call DestroyTimer(t)
set yo=u
call TriggerExecute(RV)
else
set i=i-1
call SetUnitFlyHeight(u,I2R(i)*6.,.0)
call MoveLocation(l,GetLocationX(l)+10*Cos(nR*bj_DEGTORAD),GetLocationY(l)+10*Sin(nR*bj_DEGTORAD))
call SetUnitPositionLoc(u,l)
call SaveInteger(JE,s,0,i)
endif
call RemoveLocation(l)
set l=null
set t=null
endfunction
function SPELL_Nuke takes nothing returns nothing
local location uf=GetUnitLoc(GetTriggerUnit())
local location rN=GetRandomLocInRect(Mx[Fi[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]])
local real nR=AngleBetweenPoints(uf,rN)
local location l=rR(rN,-2500,nR)
local unit Uf
local timer t=CreateTimer()
local integer s=GetHandleId(t)
local effect e
local unit u
call PlaySoundBJ(in)
call PlaySoundBJ(nn)
set u=CreateUnitAtLoc(GetTriggerPlayer(),'h06X',uf,270)
call SetUnitTimeScalePercent(u,20)
set e=AddSpecialEffectLoc("Abilities\\Spells\\Other\\Levelup\\LevelupCaster.mdl",uf)
call DestroyEffect(e)
set e=null
call TriggerSleepAction(5)
set Uf=CreateUnitAtLoc(GetTriggerPlayer(),'h06V',l,nR)
call SaveInteger(JE,s,0,250)
call SaveUnitHandle(JE,s,1,Uf)
call SetUnitFlyHeight(Uf,1500.,.0)
call TimerStart(t,.04,true,function Tf)
call RemoveLocation(l)
set l=null
call RemoveLocation(uf)
set uf=null
set t=null
call RemoveLocation(rN)
set rN=null
call RemoveUnit(u)
endfunction
function wf takes nothing returns nothing
local unit Uf=yo
local location l=GetUnitLoc(Uf)
local player p=GetOwningPlayer(Uf)
local unit u
local unit u2
local real xd=GetTimeOfDay()
call RemoveUnit(Uf)
set u=CreateUnitAtLoc(p,'h06W',l,270)
call SetUnitAnimation(u,"Death")
call SetUnitTimeScalePercent(u,12)
set u2=CreateUnitAtLoc(p,'h06W',l,270)
call SetUnitAnimation(u2,"Death")
call SetUnitTimeScalePercent(u2,12)
call AbortCinematicFadeBJ()
call CinematicFadeCommonBJ('d','d','d',.25,"ReplaceableTextures\\CameraMasks\\White_mask.blp",'d',0)
call ContinueCinematicFadeAfterBJ(.75,'d','d','d',0,"ReplaceableTextures\\CameraMasks\\White_mask.blp")
call FinishCinematicFadeAfterBJ(1.5)
call SetTimeOfDay(12.)
call UnitDamagePointLoc(u,.0,400,l,600,ATTACK_TYPE_HERO,DAMAGE_TYPE_FIRE)
call UnitDamagePointLoc(u,.0,800,l,600,ATTACK_TYPE_HERO,DAMAGE_TYPE_FIRE)
call UnitDamagePointLoc(u,.0,1200,l,600,ATTACK_TYPE_HERO,DAMAGE_TYPE_FIRE)
call PlaySoundAtPointBJ(an,'d',l,0)
call TriggerSleepAction(1)
call TriggerSleepAction(1)
call SetTimeOfDay(xd)
call TriggerSleepAction(11)
call RemoveUnit(u)
call RemoveUnit(u2)
call RemoveLocation(l)
set l=null
set p=null
endfunction
function Wf takes nothing returns boolean
return(GetUnitTypeId(GetTriggerUnit())=='h04M')or(GetUnitTypeId(GetEnteringUnit())=='n01B')
endfunction
function yf takes nothing returns boolean
return(Wf())
endfunction
function Yf takes nothing returns nothing
call SetUnitVertexColorBJ(GetTriggerUnit(),32.,.0,53.,40.)
endfunction
function SPELL_ForgottenOne takes nothing returns nothing
local unit u=(nA(iO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
local integer i=0
if u==null then
return
endif
loop
exitwhen i>5
set do=GetUnitX(u)+64.*Cos(60.*I2R(i)*bj_DEGTORAD)
set Co=GetUnitY(u)+64.*Sin(60.*I2R(i)*bj_DEGTORAD)
if Kr then
set bj_lastCreatedUnit=CreateUnit(GetOwningPlayer(GetSpellAbilityUnit()),'n021',do,Co,AngleBetweenPoints(sx,Px))
else
set bj_lastCreatedUnit=CreateUnit(GetOwningPlayer(GetSpellAbilityUnit()),'n01C',do,Co,AngleBetweenPoints(sx,Px))
endif
call UnitApplyTimedLife(bj_lastCreatedUnit,'BTLF',9.)
set i=i+1
endloop
endfunction
function SPELL_WellOfPain takes nothing returns nothing
local unit u=(nA(xO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
if(u==null)then
return
endif
call IB("Abilities\\Spells\\Undead\\DeathPact\\DeathPactTarget.mdl",u,"origin")
if HB(u,GetSpellAbilityUnit())then
call UnitDamageTargetBJ(GetSpellAbilityUnit(),u,200.,ATTACK_TYPE_NORMAL,DAMAGE_TYPE_SONIC)
endif
endfunction
function SPELL_EyeOfCorruption takes nothing returns nothing
call RN(iv,GetSpellAbilityUnit())
endfunction
function SPELL_DeathPit takes nothing returns nothing
local unit u
local effect e=null
local location l=null
set u=(nA(xO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
if u==null then
return
endif
if HB(u,GetSpellAbilityUnit())then
call UnitDamageTargetBJ(GetSpellAbilityUnit(),u,50000.,ATTACK_TYPE_NORMAL,DAMAGE_TYPE_DEATH)
endif
call XB("Abilities\\Spells\\Undead\\DeathCoil\\DeathCoilSpecialArt.mdl",u)
set u=GetSpellAbilityUnit()
call SetUnitAnimation(u,"work")
call TriggerSleepAction(1.)
call ResetUnitAnimation(u)
endfunction
function SPELL_MagicTowerRuin takes nothing returns nothing
local integer i=GetRandomInt(0,8)
local unit u=(nA(xO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
call XB("Abilities\\Spells\\Orc\\FeralSpirit\\feralspiritdone.mdl",GetSpellAbilityUnit())
if u==null then
return
endif
call IB("Abilities\\Spells\\Orc\\FeralSpirit\\feralspiritdone.mdl",u,"origin")
if not HB(u,GetSpellAbilityUnit())then
return
endif
if i==0 then
call XB("Abilities\\Spells\\Orc\\FeralSpirit\\feralspiritdone.mdl",u)
call ExplodeUnitBJ(u)
set i=(1+GetPlayerId(GetOwningPlayer(GetSpellAbilityUnit())))
set Cr[i]=Cr[i]+1
set Ra[Fi[i]]=Ra[Fi[i]]+1
elseif i==1 then
call UnitDamageTargetBJ(GetSpellAbilityUnit(),u,50000.,ATTACK_TYPE_NORMAL,DAMAGE_TYPE_DEATH)
elseif i==2 then
call UnitDamageTargetBJ(GetSpellAbilityUnit(),u,500.,ATTACK_TYPE_NORMAL,DAMAGE_TYPE_DEATH)
elseif i==3 then
call IB("Abilities\\Spells\\Human\\Avatar\\AvatarCaster.mdl",u,"origin")
call UnitAddAbility(u,'A06T')
call UnitAddAbility(u,'A06U')
call SetUnitLifePercentBJ(u,'d')
elseif i==4 then
call aN(Dv,GetSpellAbilityUnit(),u)
call TriggerSleepAction(1.)
call pA(u)
if GetUnitTypeId(u)=='h03A' then
call TriggerSleepAction(44.5)
call IssueImmediateOrderById(u,852055)
call TriggerSleepAction(.5)
call pA(u)
return
endif
elseif i==5 then
call nN(fv,GetSpellAbilityUnit(),u)
elseif i==6 then
call XB("Abilities\\Spells\\Orc\\FeralSpirit\\feralspiritdone.mdl",u)
call LB(u)
call ShowUnit(u,false)
call Ac('n01S',u,GetSpellAbilityUnit(),GetTriggerPlayer())
call RemoveUnit(u)
return
endif
endfunction
function zf takes nothing returns nothing
if((Fi[GetPlayerId(GetOwningPlayer((GetEnumUnit())))+1])==(Fi[GetPlayerId(GetOwningPlayer((av)))+1]))and IsUnitType(GetEnumUnit(),UNIT_TYPE_SAPPER)then
call aN(Bv,av,GetEnumUnit())
endif
endfunction
function SPELL_Gjallarhorn takes nothing returns nothing
local location l=GetUnitLoc(GetSpellAbilityUnit())
local group g=AR(500.,l)
call XB("Abilities\\Spells\\Other\\HowlOfTerror\\HowlCaster.mdl",GetSpellAbilityUnit())
set av=GetSpellAbilityUnit()
call ForGroupBJ(g,function zf)
call DestroyGroup(g)
call RemoveLocation(l)
set g=null
set l=null
endfunction
function SPELL_OracleOfSirens takes nothing returns nothing
local unit u=(nA(xO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
if u==null or not HB(u,GetSpellAbilityUnit())then
return
endif
call nN(W,GetSpellAbilityUnit(),u)
endfunction
function SPELL_FrozenMushroom takes nothing returns nothing
local unit u=(nA(rO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
if(u==null)or not HB(u,GetSpellAbilityUnit())then
return
endif
call aN(kv,GetSpellAbilityUnit(),u)
endfunction
function SPELL_CeremonialTotem takes nothing returns nothing
local unit u=(nA(xO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]))
if(u==null)then
return
endif
call UnitAddAbility(u,'A03B')
call UnitAddAbility(u,'A03A')
call UnitAddAbility(u,'A03D')
call UnitAddAbility(u,'A08L')
set Mi=GetRandomInt(1,3)
if(Mi==1)then
call UnitAddAbility(u,'A05I')
call UnitAddAbility(u,'A06W')
else
if(Mi==2)then
call UnitAddAbility(u,'A08M')
call UnitAddAbility(u,'A06Y')
else
call UnitAddAbility(u,'A08R')
call UnitAddAbility(u,'A06X')
endif
endif
call IB("Abilities\\Spells\\Undead\\ReplenishHealth\\ReplenishHealthCasterOverhead.mdl",u,"overhead")
call XB("Abilities\\Spells\\Human\\DispelMagic\\DispelMagicTarget.mdl",GetSpellAbilityUnit())
endfunction
function SPELL_SerpentRock takes nothing returns nothing
local unit u=(nA(xO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
call aN(Jv,GetSpellAbilityUnit(),u)
set u=GetSpellAbilityUnit()
call TriggerSleepAction(.5)
call SetUnitAnimation(u,"attack")
call TriggerSleepAction(1.)
call ResetUnitAnimation(u)
endfunction
function SPELL_WorldFreezer takes nothing returns nothing
local unit u
local unit u2
local real Zf
local integer i=0
local player p=GetOwningPlayer(GetSpellAbilityUnit())
local real x=GetUnitX(GetSpellAbilityUnit())
local real y=GetUnitY(GetSpellAbilityUnit())
set u=GetSpellAbilityUnit()
call SetUnitAnimation(u,"death")
call TriggerSleepAction(1.5)
call TimerStart(Bo,.04,true,null)
set Zf=I2R(Fi[(1+GetPlayerId(p))])*180
loop
exitwhen i>2
set u2=CreateUnit(p,'h08U',x,y,ModuloReal(Zf+GetRandomReal(-55,55)+360,360))
if(Kr)then
call UnitRemoveAbility(u2,'A080')
call UnitAddAbility(u2,'A084')
endif
call GroupAddUnit(tx,u2)
set i=i+1
endloop
call EnableWeatherEffect(kx,true)
call TriggerSleepAction(3.7)
call ResetUnitAnimation(u)
call TriggerSleepAction(2.6)
call EnableWeatherEffect(kx,false)
endfunction
function vF takes nothing returns nothing
local group g=CreateGroup()
local group eF
local unit u
local unit u2
local real x
local real y
local integer i
call GroupAddGroup(tx,g)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
set x=GetUnitX(u)+Cos(GetUnitFacing(u)*bj_DEGTORAD)*10
if(x>=fr)or(x<=Oo)then
call GroupRemoveUnit(tx,u)
call RemoveUnit(u)
else
set y=GetUnitY(u)+Sin(GetUnitFacing(u)*bj_DEGTORAD)*10
if(y>=Fr)or(y<=Xo)then
set y=GetUnitY(u)+Sin((360-GetUnitFacing(u))*bj_DEGTORAD)*30
call SetUnitFacing(u,360-GetUnitFacing(u))
endif
call SetUnitX(u,x)
call SetUnitY(u,y)
set i=GetUnitUserData(u)+1
if(i>50)then
call SetUnitUserData(u,0)
set av=u
set eF=CreateGroup()
call GroupEnumUnitsInRange(eF,x,y,700,Rv)
set u2=GroupPickRandomUnit(eF)
if(u2!=null)then
if IsUnitType(u2,UNIT_TYPE_FLYING)then
call aN(Sv,u,u2)
else
call aN(tv,u,u2)
call aN(Tv,u,u2)
endif
endif
call DestroyGroup(eF)
set eF=null
else
call SetUnitUserData(u,i)
endif
endif
endloop
call DestroyGroup(g)
set g=null
if IsUnitGroupEmptyBJ(tx)then
call PauseTimer(Bo)
endif
endfunction
function Trig_Ausrotten_Conditions takes nothing returns boolean
return GetSpellAbilityId()=='A01W'
endfunction
function SPELL_Erasor takes nothing returns nothing
local integer i
local unit u
local integer rl
call IB("Abilities\\Spells\\Items\\TomeOfRetraining\\TomeOfRetrainingCaster.mdl",GetSpellAbilityUnit(),"origin")
set fa=GetUnitTypeId((nA(xO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])])))
set i=GetUnitPointValueByType(fa)
set rl=xO[(Fi[GetPlayerId(GetOwningPlayer((GetSpellAbilityUnit())))+1])]
call OA(rl)
if i>'d' then
loop
set u=RA(rl)
exitwhen u==null
if GetUnitPointValue(u)==i then
call IB("Abilities\\Spells\\Items\\AIil\\AIilTarget.mdl",u,"origin")
call nN(rv,GetSpellAbilityUnit(),u)
endif
endloop
else
loop
set u=RA(rl)
exitwhen u==null
if GetUnitTypeId(u)==fa then
call IB("Abilities\\Spells\\Items\\AIil\\AIilTarget.mdl",u,"origin")
call nN(rv,GetSpellAbilityUnit(),u)
endif
endloop
endif
endfunction
function SPELL_StasisTotem takes nothing returns nothing
local unit u=GetSpellAbilityUnit()
call xN(Mv,u)
call TriggerSleepAction(1.)
call ResetUnitAnimation(u)
endfunction
function SPELL_CityOfMagic takes nothing returns nothing
local unit u=(nA(xO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
if(u==null)or not HB(u,GetSpellAbilityUnit())then
return
endif
call nN(Cv,GetSpellAbilityUnit(),u)
call TriggerSleepAction(1.)
call pA(u)
if GetUnitTypeId(u)=='h03A' then
call TriggerSleepAction(44.5)
call IssueImmediateOrderById(u,852055)
call TriggerSleepAction(.5)
call pA(u)
endif
endfunction
function SPELL_Volcano takes nothing returns nothing
local unit u=(nA(iO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
local integer i
if Kr then
call VN(qv,GetSpellAbilityUnit(),u)
else
call VN(Pv,GetSpellAbilityUnit(),u)
endif
endfunction
function SPELL_AncientPyramide takes nothing returns nothing
local unit u=(nA(iO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
call oN(Gv,GetSpellAbilityUnit(),u)
endfunction
function SPELL_ShrineOfDestruction takes nothing returns nothing
local unit u=(nA(oO[aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]]))
local integer i=0
loop
exitwhen((GetUnitAbilityLevel((u),'A06V')>0)==false)
set u=(nA(oO[aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]]))
set i=i+1
if(i>=10)then
return
exitwhen true
endif
endloop
if(u==null)then
return
endif
call XB("Abilities\\Spells\\Human\\MarkOfChaos\\MarkOfChaosTarget.mdl",u)
set i=Fi[(1+GetPlayerId(GetOwningPlayer(GetSpellAbilityUnit())))]
set Gi[i]=(Gi[i]+1)
call MultiboardSetItemValueBJ(ar,4,Xa[i],I2S(Gi[i]))
call KillUnit(u)
endfunction
function SPELL_FrostLauncher takes nothing returns nothing
local unit u=(nA(oO[aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]]))
local fogmodifier f
call XB("Objects\\Spawnmodels\\Naga\\NagaDeath\\NagaDeath.mdl",GetSpellAbilityUnit())
if u==null then
return
endif
call cN('h04G',GetSpellAbilityUnit(),GetSpellAbilityUnit(),20.)
if gE then
set f=CreateFogModifierRadius(GetOwningPlayer(GetSpellAbilityUnit()),FOG_OF_WAR_VISIBLE,GetUnitX(u),GetUnitY(u),128.,true,false)
call FogModifierStart(f)
call IssueTargetOrderById(bj_lastCreatedUnit,851985,u)
call TriggerSleepAction(.1)
call DestroyFogModifier(f)
set f=null
else
call IssueTargetOrderById(bj_lastCreatedUnit,851985,u)
endif
endfunction
function SPELL_GreaterFrostLauncher takes nothing returns nothing
local unit u=(nA(oO[aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]]))
local fogmodifier f
call XB("Objects\\Spawnmodels\\Naga\\NagaDeath\\NagaDeath.mdl",GetSpellAbilityUnit())
if u==null then
return
endif
call cN('h04H',GetSpellAbilityUnit(),GetSpellAbilityUnit(),20.)
if gE then
set f=CreateFogModifierRadius(GetOwningPlayer(GetSpellAbilityUnit()),FOG_OF_WAR_VISIBLE,GetUnitX(u),GetUnitY(u),128.,true,false)
call FogModifierStart(f)
call IssueTargetOrderById(bj_lastCreatedUnit,851985,u)
call TriggerSleepAction(.1)
call DestroyFogModifier(f)
set f=null
else
call IssueTargetOrderById(bj_lastCreatedUnit,851985,u)
endif
endfunction
function SPELL_Annihilator takes nothing returns nothing
local location l1=GetUnitLoc(GetTriggerUnit())
local location l2
local integer i=0
local real nR=bj_RADTODEG*Atan2(GetUnitY(GetSpellTargetUnit())-GetUnitY(GetTriggerUnit()),GetUnitX(GetSpellTargetUnit())-GetUnitX(GetTriggerUnit()))
set nR=ModuloReal(nR+20,360)
loop
exitwhen i>3
set nR=ModuloReal(nR+350,360)
set l2=rR(l1,'d',nR)
call EN(Q,GetTriggerUnit(),GetLocationX(l2),GetLocationY(l2))
call RemoveLocation(l2)
set i=i+1
endloop
call RemoveLocation(l1)
set l1=null
set l2=null
endfunction
function SPELL_GruntSergeant takes nothing returns nothing
local unit u=GetSpellAbilityUnit()
local unit u2
local group g=CreateGroup()
local real xF
local real x=GetUnitX(GetSpellTargetUnit())
local real y=GetUnitY(GetSpellTargetUnit())
local real aR=SquareRoot((GetUnitX(u)-x)*(GetUnitX(u)-x)+(GetUnitY(u)-y)*(GetUnitY(u)-y))
call cN('h09Q',u,u,3)
call IssuePointOrderById(bj_lastCreatedUnit,851984,x,y)
call TriggerSleepAction(aR/ 700)
call iN(cv,u,x,y)
set av=u
call GroupEnumUnitsInRange(g,x,y,300,Rv)
loop
set u2=FirstOfGroup(g)
exitwhen u2==null
call GroupRemoveUnit(g,u2)
set xF=RMinBJ(GetUnitState(u2,UNIT_STATE_MANA),'d')
call SetUnitState(u2,UNIT_STATE_MANA,GetUnitState(u2,UNIT_STATE_MANA)-xF)
if(xF>0)then
call IB("Abilities\\Spells\\Human\\Feedback\\SpellBreakerAttack.mdl",u2,"origin")
call UnitDamageTarget(bj_lastCreatedUnit,u2,xF,true,false,ATTACK_TYPE_CHAOS,DAMAGE_TYPE_NORMAL,WEAPON_TYPE_WHOKNOWS)
endif
endloop
call DestroyGroup(g)
set g=null
endfunction
function SPELL_MineLayer takes nothing returns nothing
local unit u=GetSpellAbilityUnit()
local player p=GetOwningPlayer(u)
local real aR=GetRandomReal(70,350)
local real nR=GetRandomReal(0,360)
local real x=GetUnitX(u)+aR*Cos(nR*bj_DEGTORAD)
local real y=GetUnitY(u)+aR*Sin(nR*bj_DEGTORAD)
call cN('h09M',u,u,3)
call IssuePointOrderById(bj_lastCreatedUnit,851984,x,y)
call TriggerSleepAction(aR/ 700)
set u=CreateUnit(p,'n025',x,y,nR)
call GroupAddUnit(Ki,u)
endfunction
function SPELL_Dragonhawk takes nothing returns nothing
local unit u=GetSpellAbilityUnit()
local group g=CreateGroup()
local integer i=0
local unit u2
set av=u
call GroupEnumUnitsInRange(g,GetUnitX(GetSpellTargetUnit()),GetUnitY(GetSpellTargetUnit()),400,Ov)
loop
set u2=FirstOfGroup(g)
set i=i+1
exitwhen u2==null
exitwhen i>4
call GroupRemoveUnit(g,u2)
call aN(ev,u,u2)
endloop
call DestroyGroup(g)
set g=null
endfunction
function SPELL_Druid takes nothing returns nothing
call aN(xv,GetSpellAbilityUnit(),GetSpellTargetUnit())
endfunction
function SPELL_SageDruid takes nothing returns nothing
local unit u=GetSpellAbilityUnit()
local group g=CreateGroup()
local integer i=0
local unit u2
call GroupEnumUnitsInRange(g,GetUnitX(GetSpellTargetUnit()),GetUnitY(GetSpellTargetUnit()),350,null)
loop
exitwhen i>2
set u2=FirstOfGroup(g)
exitwhen u2==null
call GroupRemoveUnit(g,u2)
if(not IsUnitType(u2,UNIT_TYPE_DEAD))and((Fi[GetPlayerId(GetOwningPlayer((u2)))+1])!=(Fi[GetPlayerId(GetOwningPlayer((u)))+1]))and IsUnitType(u2,UNIT_TYPE_GROUND)then
set i=i+1
call aN(Hv,u,u2)
endif
endloop
call DestroyGroup(g)
set g=null
endfunction
function SPELL_IceQueen takes nothing returns nothing
call nN(dv,GetSpellAbilityUnit(),GetSpellTargetUnit())
endfunction
function SPELL_AncientWandigoo takes nothing returns nothing
call xN(q,GetSpellAbilityUnit())
call IB("Abilities\\Spells\\Other\\HowlOfTerror\\HowlCaster.mdl",GetSpellAbilityUnit(),"origin")
endfunction
function SPELL_Magnataur takes nothing returns nothing
call xN(Fv,GetSpellAbilityUnit())
call IB("Abilities\\Spells\\Orc\\WarStomp\\WarStompCaster.mdl",GetSpellAbilityUnit(),"origin")
endfunction
function SPELL_ChaosChamp takes nothing returns nothing
call IB("Abilities\\Spells\\NightElf\\BattleRoar\\RoarCaster.mdl",GetSpellAbilityUnit(),"origin")
call xN(T,GetSpellAbilityUnit())
endfunction
function SPELL_Warlock takes nothing returns nothing
local unit u=GetSpellAbilityUnit()
call UnitRemoveAbility(GetSpellAbilityUnit(),'A00F')
call xN(Qv,u)
call IB("Units\\NightElf\\Wisp\\WispExplode.mdl",u,"origin")
call TriggerSleepAction(.3)
call IssuePointOrderByIdLoc(u,851986,Yx[ModuloInteger(Fi[(1+GetPlayerId(GetOwningPlayer(u)))]+1,2)])
call TriggerSleepAction(5)
call IssueImmediateOrderById(u,851993)
call TriggerSleepAction(6.6)
call UnitAddAbility(u,'A00F')
call pA(u)
endfunction
function SPELL_Wizard takes nothing returns nothing
local unit u=GetSpellAbilityUnit()
call aN(sv,u,GetSpellTargetUnit())
call TriggerSleepAction(.8)
call pA(u)
endfunction
function SPELL_Sorceress takes nothing returns nothing
local unit u=GetSpellAbilityUnit()
call aN(lv,u,GetSpellTargetUnit())
call TriggerSleepAction(.8)
call pA(u)
endfunction
function SPELL_NagaSiren takes nothing returns nothing
local unit u=GetSpellAbilityUnit()
call aN(gv,u,GetSpellTargetUnit())
call IssueImmediateOrderById(u,852126)
call TriggerSleepAction(1.)
call MA(u)
endfunction
function SPELL_Troll takes nothing returns nothing
call aN(pv,GetSpellAbilityUnit(),GetSpellTargetUnit())
endfunction
function SPELL_Paladin takes nothing returns nothing
local unit u=GetSpellAbilityUnit()
call IssueTargetOrderById(u,852066,GetSpellTargetUnit())
call TriggerSleepAction(1.)
call MA(u)
endfunction
function SPELL_PaladinRezz takes nothing returns nothing
local unit u=GetSpellAbilityUnit()
local location l=GetUnitLoc(u)
local group g
set av=u
set g=XR(900.,l,Vv)
call UnitAddAbility(GetSpellTargetUnit(),'A03L')
if(CountUnitsInGroup(g)>0)then
call IssueImmediateOrderById(u,852094)
call TriggerSleepAction(1.)
call pA(u)
endif
call DestroyGroup(g)
call RemoveLocation(l)
set l=null
set g=null
endfunction
function SPELL_FaerieDragon takes nothing returns nothing
local unit u=GetSpellAbilityUnit()
call TriggerSleepAction(1.2)
call IssuePointOrderByIdLoc(u,851983,Yx[(Fi[GetPlayerId(GetOwningPlayer((u)))+1])])
endfunction
function oF takes unit u returns boolean
if GetUnitAbilityLevel(u,'A03U')==1 then
return true
endif
set I=(Fi[GetPlayerId(GetOwningPlayer((u)))+1])
if Yo[I*4096+GetUnitUserData(u)]>7 then
if kA(u,qx[I])then
return true
else
set Yo[I*4096+GetUnitUserData(u)]=0
if false then
return false
endif
endif
endif
if(not(GetUnitCurrentOrder(u)==0))then
return false
endif
if(not(GetUnitAbilityLevel(u,'A07I')==0))then
return false
endif
return true
endfunction
function rF takes nothing returns nothing
local timer t=GetExpiredTimer()
local integer iF=GetHandleId(t)
local unit u=LoadUnitHandle(kE,0,iF)
call SetUnitPathing(u,true)
call RemoveSavedHandle(kE,0,iF)
call DestroyTimer(t)
set t=null
endfunction
function aF takes nothing returns nothing
local timer t=GetExpiredTimer()
local integer iF=GetHandleId(t)
local unit u=LoadUnitHandle(kE,0,iF)
call pA(u)
call TimerStart(t,2,false,function rF)
endfunction
function nF takes unit u returns nothing
local integer i=GetUnitUserData(u)
local real x=GetUnitX(u)
local real y=GetUnitY(u)
local timer t
if(RAbsBJ(x-Qi[i])+RAbsBJ(y-Ti[i]))>'d' then
set Vr[i]=0
set Qi[i]=GetUnitX(u)
set Ti[i]=GetUnitY(u)
return
endif
set Vr[i]=Vr[i]+1
set Qi[i]=GetUnitX(u)
set Ti[i]=GetUnitY(u)
if(Vr[i]>1)then
set Vr[i]=0
call SetUnitPathing(u,false)
set t=CreateTimer()
call TimerStart(t,.1,false,function aF)
call SaveUnitHandle(kE,0,GetHandleId(t),u)
endif
endfunction
function VF takes nothing returns nothing
local unit u
local integer rl
local integer t=0
loop
exitwhen(t)>1
set rl=xO[t]
call OA(rl)
loop
set u=RA(rl)
exitwhen u==null
if(oF(u))then
call pA(u)
if not Sx then
call nF(u)
endif
endif
endloop
set t=t+1
endloop
endfunction
function EF takes nothing returns boolean
return(Eo==0)
endfunction
function XF takes nothing returns boolean
return(Mi>1)
endfunction
function OF takes nothing returns boolean
return(Mi==1)
endfunction
function RF takes nothing returns boolean
return(Mi<=0)
endfunction
function IF takes nothing returns boolean
return(Eo==1)
endfunction
function AF takes nothing returns boolean
return(Eo==2)
endfunction
function NF takes nothing returns boolean
return(Eo==3)
endfunction
function bF takes nothing returns boolean
return(Eo==4)
endfunction
function BF takes nothing returns boolean
return(Eo==5)
endfunction
function cF takes nothing returns boolean
return(Eo==6)
endfunction
function CF takes nothing returns boolean
return(Eo==7)
endfunction
function dF takes nothing returns boolean
return(Eo==8)
endfunction
function DF takes nothing returns boolean
return(Eo==9)
endfunction
function fF takes nothing returns boolean
return(Fa)
endfunction
function FF takes nothing returns boolean
return(Eo==10)
endfunction
function gF takes nothing returns boolean
return(Eo==11)
endfunction
function GF takes nothing returns boolean
return(Eo==12)
endfunction
function Trig_boonreminder_Func018001 takes nothing returns boolean
return(Eo==12)
endfunction
function hF takes nothing returns nothing
set Mi=((Wx-1)-IMaxBJ(ia[0],ia[1]))
if(EF())then
set fx="|cffFFFF80Если вы новичек в этой карте, проверьте |cff80FF00Справочник|cffFFFF80 (|cffFFBA17F9|cffFFFF80) для полезной информации!|r"
endif
if(IF())then
if(RF())then
set Eo=(Eo+1)
else
if(OF())then
set fx=(("|cffFFFF80После этого раунда будет ещё |cffFFDF00"+I2S(Mi))+"|cffFFFF80. Пожалуйста, не выходите после этого раунда!|r")
else
if(XF())then
set fx=(("|cffFFFF80После этого раунда будет ещё |cffFFDF00"+I2S(Mi))+"|cffFFFF80. Пожалуйста, не выходите после этого раунда! |r")
endif
endif
endif
endif
if(AF())then
set fx="|cffFFFF80У вашего рабочего есть только |c00ff0000ОДИН|cffFFFF80 Спасительный удар - используйте его мудро, это может решить исход раунда!|r"
endif
if(NF())then
set fx="|cffFFFF80Если вы не можете сдержать врага на линии - постройте башню. Заметьте. что у Наг и Хаоса нет защитных башен|r"
endif
if(bF())then
set fx="|cffFFFF80Старайтесь тренеровать юнитов, чья атака легко пробьет вражескую броню. Напишитe |c00ff0000-armor|cffFFFF80 если вы не знаете соотношение защиты и атаки!|r"
endif
if(BF())then
set fx="|cffFFFF80Если будет свободное время - посетите оффициальный сайт карты |cffFFBF00http://www.eeve.org|cffFFFF80.|r"
endif
if(cF())then
set fx="|cffFFFF80У каждой расы есть как минимум одно Легендарное здание. Однако, на их постройку требуется еда, которую можно купить в Замке в виде сыра.|r"
endif
if(CF())then
set fx="|cffFFFF80Замок продаёт полезные предметы, помогающие в победе над врагом. Так-же, там можно купить Сыр.|r"
endif
if(dF())then
set fx="|cffFFFF80Подсчет дохода очень прост: Каждое здание даёт вам доход как часть своей цены. Особые здания дают меньше дохода, чем производящие юнитов. Башни дают меньше всего дохода.|r"
endif
if(DF())then
set fx="|cffFFFF80Победа противника на уровне типа защиты и атаки - залог победы в этой карте. Всегда следите что построили враги и союзники, и старайтесь строить здания, подходящие к данной ситуации как можно больше|r"
endif
if(FF())then
if(fF())then
set Eo=(Eo+1)
else
set fx="|cffFFFF80Через секунд после появления сообщения \"МОНЕТКА!\" На вашей базе где угодно может появится монетка. Будьте готовы быстро схватить её, иначе она исчезнет|r"
endif
endif
if(gF())then
set fx="|cffFFFF80Castle Fight это командная игра. Если вы не можете одолеть противника на своей линии - попросите помощи у союзника.|r"
endif
if(GF())then
set fx="|cffFFFF80В этой карте имеется множество модов. Попробуйте каждый из них! Полный список можно найти в Справочнике (F9).|r"
endif
set fx=("|cff80FF00Подсказка: |r"+fx)
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,fx)
if((Eo==12))then
set Eo=0
else
set Eo=(Eo+1)
endif
endfunction
function HF takes nothing returns nothing
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffFFFF80МОНЕТКА!|r")
call StartTimerBJ(zx[0],false,4.)
endfunction
function jF takes nothing returns boolean
return(nr[bj_forLoopAIndex]==false)
endfunction
function JF takes nothing returns nothing
set bj_forLoopAIndex=0
set bj_forLoopAIndexEnd=1
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
if(jF())then
set ri[bj_forLoopAIndex]=-10
endif
call RemoveItem(mx[bj_forLoopAIndex])
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
endfunction
function kF takes nothing returns boolean
return(nr[bj_forLoopAIndex]==false)
endfunction
function KF takes nothing returns boolean
return(GetItemTypeId(GetEnumItem())=='I000')
endfunction
function lF takes nothing returns nothing
if(KF())then
call RemoveItem(GetEnumItem())
endif
endfunction
function LF takes nothing returns nothing
set bj_forLoopAIndex=0
set bj_forLoopAIndexEnd=1
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
if(kF())then
set ri[bj_forLoopAIndex]=-10
endif
call EnumItemsInRectBJ(Mx[bj_forLoopAIndex],function lF)
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
endfunction
function mF takes nothing returns nothing
set ba=(ba+3.)
call StartTimerBJ(zx[1],false,4.75)
set bj_forLoopAIndex=0
set bj_forLoopAIndexEnd=1
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
call CreateItemLoc('I000',GetRandomLocInRect(Mx[bj_forLoopAIndex]))
call AddSpecialEffectLocBJ(GetItemLoc(bj_lastCreatedItem),"Abilities\\Spells\\Demon\\DarkPortal\\DarkPortalTarget.mdl")
call DestroyEffect(bj_lastCreatedEffect)
set nr[bj_forLoopAIndex]=false
set mx[bj_forLoopAIndex]=bj_lastCreatedItem
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
endfunction
function MF takes nothing returns nothing
set ba=(ba+3.)
call StartTimerBJ(zx[1],false,7.)
set bj_forLoopAIndex=0
set bj_forLoopAIndexEnd=1
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
set bj_forLoopBIndex=1
set bj_forLoopBIndexEnd=uo
loop
exitwhen bj_forLoopBIndex>bj_forLoopBIndexEnd
call CreateItemLoc('I000',GetRandomLocInRect(Mx[bj_forLoopAIndex]))
call AddSpecialEffectLocBJ(GetItemLoc(bj_lastCreatedItem),"Abilities\\Spells\\Demon\\DarkPortal\\DarkPortalTarget.mdl")
call DestroyEffect(bj_lastCreatedEffect)
set bj_forLoopBIndex=bj_forLoopBIndex+1
endloop
set nr[bj_forLoopAIndex]=false
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
endfunction
function pF takes nothing returns nothing
local real m
local real a
local real b
set D=(1+GetPlayerId(GetEnumPlayer()))
set m=CF_M*(1.+.10*CF_FE[D-1])
// командир Саша: +12% к доходу
if CF_Cmd[D-1]==1 then
set m=CF_M*(1.+.10*CF_FE[D-1]+.12)
endif
// сила ботов из меню: +15/30/80% к доходу (только ботам)
if se[D] and CF_BD>0 then
set m=m+CF_M*I2R(CF_BD)/100.
// (v37, просьба владельца 2026-11-21: добавка +20% дохода на высшем уровне убрана, доход бота = уровень меню)
endif

set a=GetWidgetLife(fE)/RMaxBJ(1.,GetUnitState(fE,UNIT_STATE_MAX_LIFE))
set b=GetWidgetLife(FE)/RMaxBJ(1.,GetUnitState(FE,UNIT_STATE_MAX_LIFE))
if(Fi[D]==0 and a<b-.3)or(Fi[D]==1 and b<a-.3)then
set m=m*1.15
endif
set F=R2I(I2R(jI(D))*m+.5)

set ao[Fi[D]]=ao[Fi[D]]+F
call AdjustPlayerStateBJ(F,GetEnumPlayer(),PLAYER_STATE_RESOURCE_GOLD)
set Hr[D]=Hr[D]+F
call DisplayTextToPlayer(GetEnumPlayer(),0,0,"Доход: |cffFFFF00"+I2S(F)+"|r")
endfunction
function PF takes nothing returns nothing
local real f
set CF_T=CF_T+TimerGetTimeout(ko)
if CF_T<480. then
set f=.3
elseif CF_T<960. then
set f=.5
elseif CF_T<1500. then
set f=.7
else
set f=1.
endif
set CF_M=.5+.5*f
set ao[0]=0
set ao[1]=0
call ForForce(Ba,function pF)
if RAbsBJ(TimerGetTimeout(ko)-I2R(Mo)*f)>.05 then
call TimerStart(ko,I2R(Mo)*f,true,null)
endif
call kb(ar,4,Xa[0]-1,I2S(ao[0]))
call kb(ar,4,Xa[1]-1,I2S(ao[1]))
endfunction
function qF takes nothing returns nothing
local location l=GetRandomLocInRect(Mx[Fi[(1+GetPlayerId(GetOwningPlayer(GetEnumUnit())))]])
call IssuePointOrderByIdLoc(GetEnumUnit(),851984,l)
call RemoveLocation(l)
set l=null
endfunction
function QF takes nothing returns nothing
call ForGroupBJ(Lo,function qF)
endfunction
function sF takes nothing returns nothing
set yo=(nA(iO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetEnumUnit()))))+1]))])]))
call IssueTargetOrderById(GetEnumUnit(),851983,yo)
endfunction
function SF takes nothing returns nothing
call ForGroupBJ(da,function sF)
endfunction
function tF takes nothing returns boolean
return(GetSpellAbilityId()=='A08Y')
endfunction
function TF takes nothing returns nothing
local location l=GetSpellTargetLoc()
call iN(jv,GetTriggerUnit(),GetLocationX(l),GetLocationY(l))
call RemoveLocation(l)
set l=null
endfunction
function uF takes nothing returns boolean
return(GetItemTypeId(GetManipulatedItem())=='I008')
endfunction
function UF takes nothing returns nothing
call IN(vv,GetManipulatingUnit(),GetLocationX(aa),GetLocationY(aa))
set Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]=Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+600
endfunction
function wF takes nothing returns boolean
return(GetItemTypeId(GetManipulatedItem())=='I007')
endfunction
function WF takes nothing returns nothing
call IN(hv,GetManipulatingUnit(),GetLocationX(aa),GetLocationY(aa))
set Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]=Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+1400
endfunction
function yF takes nothing returns boolean
return GetItemTypeId(GetManipulatedItem())=='I004'
endfunction
function YF takes nothing returns nothing
call RemoveItem(GetManipulatedItem())
if px then
call AdjustPlayerStateBJ(1500,GetOwningPlayer(GetTriggerUnit()),PLAYER_STATE_RESOURCE_GOLD)
call DisplayTextToPlayer(GetTriggerPlayer(),0,0,"|cffFF0000Вы не можете покупать еду! Активирован режим Без легендарных зданий!|r")
else
set Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]=Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+1500
call AdjustPlayerStateBJ(1,GetOwningPlayer(GetTriggerUnit()),PLAYER_STATE_RESOURCE_FOOD_CAP)
endif
endfunction
function zF takes nothing returns boolean
return(Ii==false)
endfunction
function ZF takes nothing returns boolean
return(Ri==false)
endfunction
function vg takes nothing returns nothing
if(ZF())then
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Только юниты|r. Вы не можете строить особые здания.")
set Ri=true
call TriggerExecute(Xn)
set bj_forLoopAIndex=1
set bj_forLoopAIndexEnd=12
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
call SetPlayerUnitAvailableBJ('h01P',true,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h056',true,Player(-1+(bj_forLoopAIndex)))
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
if(zF())then
set bj_forLoopAIndex=1
set bj_forLoopAIndexEnd=12
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
call SetPlayerUnitAvailableBJ('h008',true,Player(-1+(bj_forLoopAIndex)))
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
endif
endif
endfunction
function eg takes nothing returns boolean
return(Ii==false)
endfunction
function xg takes nothing returns boolean
return(Ea==false)
endfunction
function og takes nothing returns nothing
if(xg())then
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Без особых зданий|r. Вы не можете строить особые здания, кроме защитных башен и Сундуков с Сокровищами.")
set Ea=true
call TriggerExecute(Xn)
set bj_forLoopAIndex=1
set bj_forLoopAIndexEnd=12
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
call SetPlayerUnitAvailableBJ('h01P',true,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h056',true,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h014',true,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h03Q',true,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h01O',true,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('o000',true,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h006',true,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('n01J',true,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h073',true,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h05L',true,Player(-1+(bj_forLoopAIndex)))
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
if(eg())then
set bj_forLoopAIndex=1
set bj_forLoopAIndexEnd=12
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
call SetPlayerUnitAvailableBJ('h008',true,Player(-1+(bj_forLoopAIndex)))
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
endif
endif
endfunction
function rg takes nothing returns boolean
return(Kr==false)
endfunction
function ig takes nothing returns nothing
if(rg())then
set Kr=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Без артилерии|r. Вы не можете строить здания, атакующие вражескую базу.")
call TriggerExecute(Xn)
set bj_forLoopAIndex=1
set bj_forLoopAIndexEnd=12
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
call SetPlayerUnitAvailableBJ('h001',false,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h048',false,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h01E',false,Player(-1+(bj_forLoopAIndex)))
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
endif
endfunction
function ag takes nothing returns boolean
return(Sx==false)
endfunction
function ng takes nothing returns nothing
if(ag())then
set Sx=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Капканы|r. Вы можете блокировать юнитов своими зданиями")
endif
endfunction
function Vg takes nothing returns boolean
return(Ii==false)
endfunction
function Eg takes nothing returns nothing
if(Vg())then
set Ii=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Без Сундуков|r. Вы не можеет строить Сундуки с Сокровищами.")
set bj_forLoopAIndex=1
set bj_forLoopAIndexEnd=12
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
call SetPlayerUnitAvailableBJ('h008',false,Player(-1+(bj_forLoopAIndex)))
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
endif
endfunction
function Xg takes nothing returns boolean
return(vi==false)
endfunction
function Og takes nothing returns nothing
if(Xg())then
set vi=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Без награды|r. Вы не получаете награду за убийство юнитов и уничтожение зданий.")
set bj_forLoopAIndex=1
set bj_forLoopAIndexEnd=12
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
call SetPlayerFlagBJ(PLAYER_STATE_GIVES_BOUNTY,false,Player(-1+(bj_forLoopAIndex)))
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
endif
endfunction
function Rg takes nothing returns boolean
return(pr!=1000.)
endfunction
function Ig takes nothing returns nothing
if(Rg())then
set pr=1000.
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Без налогов|r. Вам не придётся платить налоги на ваш доход.")
endif
endfunction
function Ag takes nothing returns boolean
return(Ar==false)
endfunction
function Ng takes nothing returns nothing
if(Ag())then
set Ar=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Доминирование|r. Вы получаете дополнительный доход за удерживание линий")
set Ei[0]=xn
set Ei[1]=on
set Da[0]="upper"
set Da[1]="lower"
endif
endfunction
function bg takes nothing returns boolean
return(pr!=12.5)
endfunction
function Bg takes nothing returns nothing
if(bg())then
set pr=12.5
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Высокие налоги|r. Увеличение налогов на 10% каждые 12.5 частей дохода.")
endif
endfunction
function cg takes nothing returns boolean
return(ji==false)
endfunction
function Cg takes nothing returns nothing
if(cg())then
set ji=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Без предметов|r. Замок не продаёт предметы.")
endif
endfunction
function dg takes nothing returns boolean
return(px==false)
endfunction
function Dg takes nothing returns nothing
if(dg())then
set px=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Без Легендарных зданий|r. Вы не получаете пищи на постройку Легендарных зданий.")
endif
endfunction
function fg takes nothing returns boolean
return(mi==false)
endfunction
function Fg takes nothing returns nothing
if(fg())then
set mi=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Техно-мод|r. Вы должны улучшать технологии, чтобы строить более мощные здания.")
endif
endfunction
function gg takes nothing returns boolean
return(Cx==false)
endfunction
function Gg takes nothing returns nothing
if(gg())then
set Cx=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Фиксированный доход|r. Все игроки начинают с 100 золота и 30 доходом. Доход увеличивается только Сундуками с Сокровищами.")
endif
endfunction
function hg takes nothing returns boolean
return(fo==false)
endfunction
function Hg takes nothing returns nothing
if(hg())then
set fo=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Без Спасительного Удара|r. Ваш рабочий не получает Спасительный Удар!")
endif
endfunction
function jg takes nothing returns boolean
return(fi==false)
endfunction
function Jg takes nothing returns nothing
if(jg())then
set fi=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Ядерная битва|r. Ваш замок продаёт ядерные боеголовки!")
endif
endfunction
function kg takes nothing returns boolean
return(uo!=1)
endfunction
function Kg takes nothing returns nothing
if(kg())then
set Fa=true
set uo=1
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Монетки|r. Каждые 40 секунд на вашей базе будет появляться монетка.")
endif
endfunction
function lg takes nothing returns boolean
return(Gr)
endfunction
function Lg takes nothing returns nothing
if(lg())then
set Gr=false
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Повторяющиеся расы|r. Каждая раса может быть выбрана более одного раза.")
endif
endfunction
function mg takes nothing returns boolean
return(oi==false)
endfunction
function Mg takes nothing returns nothing
if(mg())then
set oi=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Уникальные расы|r. Каждая раса может быть выбрана только один раз (даже между командами).")
endif
endfunction
function pg takes nothing returns nothing
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Лига|r. Авто-баланс команд отключен!")
call TriggerExecute(yV)
set ii=0
call TriggerExecute(PV)
set Ci=true
endfunction
function Pg takes nothing returns boolean
return(to==false)
endfunction
function qg takes nothing returns nothing
local integer i=1
if(Pg())then
set to=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Без АФК|r. ИИ не будет брать под контроль АФК игроков.")
call DisableTrigger(VE)
call DisableTrigger(OE)
call DisableTrigger(RE)
call DisableTrigger(EE)
call DisableTrigger(XE)
endif
loop
exitwhen i>12
if Xr[i]then
set Xr[i]=false
call YR(i)
endif
set i=i+1
endloop
endfunction
function Qg takes nothing returns boolean
return(uo!=10)
endfunction
function sg takes nothing returns nothing
if(Qg())then
set uo=10
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Бешеные монетки|r. Каждые 40 секунд на вашей базе будут появляться 10 монеток.")
call DisableTrigger(dV)
call DisableTrigger(cV)
call EnableTrigger(DV)
call EnableTrigger(CV)
endif
endfunction
function Sg takes nothing returns boolean
return(Er==false)
endfunction
function tg takes nothing returns nothing
if(Sg())then
set Er=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Без воздуха|r. Вы не можете строить здания, производящие летающих юнитов.")
set bj_forLoopAIndex=1
set bj_forLoopAIndexEnd=12
loop
exitwhen bj_forLoopAIndex>bj_forLoopAIndexEnd
call SetPlayerUnitAvailableBJ('h03I',false,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h01S',false,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h009',false,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h02P',false,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h00B',false,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h015',false,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h01Y',false,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h04O',false,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h06Y',false,Player(-1+(bj_forLoopAIndex)))
call SetPlayerUnitAvailableBJ('h05J',false,Player(-1+(bj_forLoopAIndex)))
set bj_forLoopAIndex=bj_forLoopAIndex+1
endloop
endif
endfunction
function Tg takes nothing returns boolean
return(hr==false)
endfunction
function ug takes nothing returns nothing
if(Tg())then
set hr=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Стабильный мод|r. Вы не можете выбрать новую расу.")
set Yr=(Yr-1)
endif
endfunction
function Ug takes nothing returns nothing
local integer tb
if not IsPlayerInForce(GetTriggerPlayer(),er)then
call DisplayTextToPlayer(GetTriggerPlayer(),0,0,"Вы уже давали соглашение!")
return
endif
call ForceRemovePlayer(er,GetTriggerPlayer())
set tb=CountPlayersInForceBJ(er)
if tb>0 then
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,Lr[(1+GetPlayerId(GetTriggerPlayer()))]+" согласен, нужно ещё "+I2S(tb)+" голосов")
endif
call Sb()
endfunction
function wg takes nothing returns nothing
local string s
set s="Ваш Доход составляет |cffFFFF00"+I2S(gI((1+GetPlayerId(GetTriggerPlayer()))))
set s=s+"|r. Множитель Сундуков с Сокровищами |cffFFFF00 "+R2SW((fI(Kx[((1+GetPlayerId(GetTriggerPlayer())))])),1,2)
set s=s+"|r, увеличивая ваш Доход на |cffFFFF00 "+I2S(hI((1+GetPlayerId(GetTriggerPlayer()))))+"|r"
set s=s+"|r. После уплаты налогов, ваш доход составляет |cffFFFF00 "+I2S(HI((1+GetPlayerId(GetTriggerPlayer()))))
call DisplayTextToForce(BR(GetTriggerPlayer()),s)
endfunction
function Wg takes nothing returns nothing
if Pr[(1+GetPlayerId(GetTriggerPlayer()))]then
call DisplayTextToPlayer(GetTriggerPlayer(),0,0,"|cffFF0000Вы уже голосовали за ничью!|r")
else
set Pr[(1+GetPlayerId(GetTriggerPlayer()))]=true
if(qr-dI())>0 then
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,Lr[(1+GetPlayerId(GetTriggerPlayer()))]+" проголосовал за ничью! Нужно ещё |cff0000FF"+I2S((qr-dI()))+"|r голосов для перезапуска.")
else
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,Lr[(1+GetPlayerId(GetTriggerPlayer()))]+" голосует за ничью! |cff0000FF")
call DI()
endif
endif
endfunction
function yg takes nothing returns nothing
call DisplayTextToForce(BR(GetTriggerPlayer()),"|cffFFFF00Таблица брони:")
call DisplayTextToForce(BR(GetTriggerPlayer()),"|cffFFCC00Хаос: |cffFFFF00нейтрален ко всем|r")
call DisplayTextToForce(BR(GetTriggerPlayer()),"|cffFFCC00Нормальная:         |cff00FF00хороша против:|r Средняя |cffFF0000плоха против:|r Лёгкая")
call DisplayTextToForce(BR(GetTriggerPlayer()),"|cffFFCC00Колющая:           |cff00FF00хороша против:|r Лёгкая |cffFF0000плоха против:|r Тяжёлая")
call DisplayTextToForce(BR(GetTriggerPlayer()),"|cffFFCC00Магическая:           |cff00FF00хороша против:|r Тяжёлая |cffFF0000плоха против:|r Средняя")
call DisplayTextToForce(BR(GetTriggerPlayer()),"|cffFFCC00Осадная:           |cff00FF00хороша против:|r Укреплённая  |cffFF0000плоха против:|r все остальные")
call DisplayTextToForce(BR(GetTriggerPlayer()),"|cffFFCC00Заметка:|r Все типы атаки |cffFF0000плохи|r против Божественной, кроме Хаоса!")
endfunction
function Yg takes nothing returns nothing
call gA((1+GetPlayerId(GetTriggerPlayer())))
endfunction
function zg takes nothing returns boolean
return(GetItemTypeId(GetManipulatedItem())=='I001')
endfunction
function Zg takes nothing returns boolean
return(GetItemTypeId(GetManipulatedItem())=='I003')
endfunction
function vG takes nothing returns boolean
return(GetItemTypeId(GetManipulatedItem())=='I00A')
endfunction
function eG takes nothing returns boolean
return(GetItemTypeId(GetManipulatedItem())=='I009')
endfunction
function xG takes nothing returns boolean
return(GetItemTypeId(GetManipulatedItem())=='I005')
endfunction
function oG takes nothing returns nothing
if(zg())then
set Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]=(Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+150)
endif
if(Zg())then
set Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]=(Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+650)
endif
if(vG())then
set Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]=(Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+575)
endif
if(eG())then
set Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]=(Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+500)
endif
if(xG())then
set Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]=(Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+150)
endif
if GetItemTypeId(GetManipulatedItem())=='I00E' then
set Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]=(Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+300)
endif
if GetItemTypeId(GetManipulatedItem())=='I00F' then
set Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]=(Qo[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]+900)
endif
endfunction
function rG takes nothing returns integer
local integer i=1
local integer iG=-1
local integer aG=1
loop
exitwhen i>12
if(Si[i]>iG)then
set iG=Si[i]
set aG=i
endif
set i=i+1
endloop
return aG
endfunction
function nG takes nothing returns integer
local integer i=1
local integer iG=0
local integer aG=1
loop
exitwhen i>12
if(jI(i)>iG)then
set iG=jI(i)
set aG=i
endif
set i=i+1
endloop
return aG
endfunction
function VG takes nothing returns integer
local integer i=1
local integer iG=0
local integer aG=1
loop
exitwhen i>12
if(Hr[i]>iG)then
set iG=Hr[i]
set aG=i
endif
set i=i+1
endloop
return aG
endfunction
function EG takes nothing returns integer
local integer i=1
local integer iG=0
local integer aG=1
loop
exitwhen i>12
if(Ao[i]>iG)then
set iG=Ao[i]
set aG=i
endif
set i=i+1
endloop
return aG
endfunction
function XG takes nothing returns integer
local integer i=1
local integer iG=0
local integer aG=1
loop
exitwhen i>12
if(yr[i]>iG)then
set iG=yr[i]
set aG=i
endif
set i=i+1
endloop
return aG
endfunction
function OG takes nothing returns integer
local integer i=1
local integer iG=0
local integer aG=1
loop
exitwhen i>12
if(Zo[i]>iG)then
set iG=Zo[i]
set aG=i
endif
set i=i+1
endloop
return aG
endfunction
function RG takes nothing returns integer
local integer i=1
local integer iG=0
local integer aG=1
loop
exitwhen i>12
if(Cr[i]>iG)then
set iG=Cr[i]
set aG=i
endif
set i=i+1
endloop
return aG
endfunction
function IG takes nothing returns integer
local integer i=1
local integer iG=0
local integer aG=1
loop
exitwhen i>12
if(tr[i]>iG)then
set iG=tr[i]
set aG=i
endif
set i=i+1
endloop
return aG
endfunction
function AG takes nothing returns integer
local integer i=1
local integer iG=0
local integer aG=1
loop
exitwhen i>12
if(So[i]>iG)then
set iG=So[i]
set aG=i
endif
set i=i+1
endloop
return aG
endfunction
function NG takes nothing returns integer
local integer i=1
local integer iG=0
local integer bG=0
local integer aG=1
loop
exitwhen i>12
if(Ia==i)then
set bG=10000
endif
set bG=fA(i)-bG
if(bG>iG)then
set iG=bG
set aG=i
endif
set bG=0
set i=i+1
endloop
return aG
endfunction
function BG takes nothing returns nothing
local string cG=""
local integer FA=0
call eR(2)
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,20,"|cffFFFF80-----------  Статистика этого раунда  -----------|r")
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,20,"Round time: "+mA())
set Jo=R2I((TimerGetElapsed(si)+17)/ 60)
set cG="Наибольший доход: "+Lr[nG()]+" - "+pi+I2S(jI(nG()))+"|r"
if(nG()==VG())then
set cG=cG+" ("+pi+I2S(Hr[VG()])+"|r золота в сумме)"
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,20,cG)
else
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,20,cG)
set cG="Больше всего золота получено с дохода: "+Lr[VG()]+" - "+pi+I2S(Hr[VG()])+"|r"
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,20,cG)
endif
if(uo!=0)then
set cG="Больше всего монеток собрано: "+Lr[XG()]+" - "+pi+I2S(yr[XG()])+"|r"
if(XG()==OG())then
set cG=cG+" ("+pi+I2S(Zo[OG()])+"|r золота в сумме)"
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,20,cG)
else
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,20,cG)
set cG="Больше всего золота с монеток: "+Lr[OG()]+" - "+pi+I2S(Zo[OG()])+"|r"
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,20,cG)
endif
endif
set FA=fA(NG())
if(NG()==Ia)then
set FA=FA-10000
endif
set cG="Больше всего юнитов убито: "+Lr[RG()]+" - "+pi+I2S(Cr[RG()])+"|r"
if(RG()==NG())then
set cG=cG+" ("+pi+I2S(FA)+"|r золота в сумме)"
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,20,cG)
else
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,20,cG)
set cG="Больше всего золота с награды: "+Lr[NG()]+" - "+pi+I2S(FA)+"|r"
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,20,cG)
endif
set cG="Больше всего зданий: "+Lr[IG()]+" - "+pi+I2S(tr[IG()])+"|r"
if(IG()==EG())then
set cG=cG+" ("+pi+I2S(Ao[EG()])+"|r юнитов в сумме)"
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,20,cG)
else
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,20,cG)
set cG="Больше всего юнитов нанято: "+Lr[EG()]+" - "+pi+I2S(Ao[EG()])+"|r"
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,20,cG)
endif
if(Ea==false)then
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,20,"Больше всего особых зданий: "+Lr[AG()]+" - "+pi+I2S(So[AG()])+"|r")
endif
set cG="Наибольший урон СУ: "+Lr[rG()]+" - "+pi+I2S(Si[rG()])+"|r ("+pi+I2S(so[rG()])+"|r юнитов убито)"
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,20,cG)
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,20,"|cffFFFF80----------------------------------------------------|r")
set FA=0
set cG=""
endfunction
function CG takes nothing returns nothing
local integer i=0
if KE>-1 then
if cx and TimerGetRemaining(Bx)<=0 then
set cx=false
call DestroyTimer(Bx)
set Bx=null
endif
call ForForce(Me,function pc)
set KE=-1
endif
set KE=KE+1
call gN(0)
call gN(1)
call ForForce(Me,function FN)
endfunction
function dG takes integer zR returns nothing
call rc(zR)
call sB(zR)
endfunction
function DG takes integer zR returns nothing
if not IsPlayerInForce(Player(zR-1),Me)then
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(Lr[zR]+"|cffCA0000 is AFK!|r AI took control over his units."))
call dG(zR)
call SetPlayerName(Player(zR-1),GetPlayerName(Player(zR-1))+" - AFK")
set Lr[zR]=SubString(Lr[zR],0,StringLength(Lr[zR])-2)+" - AFK|r"
call eR(2)
call EnableTrigger(nE)
endif
endfunction
function fG takes nothing returns nothing
local integer i
if(to==false)then
if(IsPlayerInForce(GetOwningPlayer(GetEnumUnit()),Me)==false)then
set i=GetPlayerId(GetOwningPlayer(GetEnumUnit()))
if not Ur[i+1]then
set ra[i]=ra[i]+1
else
set ra[i]=0
endif
set Ur[i+1]=false
if(ra[i]==20)then
call DisplayTextToPlayer(GetOwningPlayer(GetEnumUnit()),0,0,"|cffCA0000WARNING|r: You did not move your worker for 5 minutes. AI will take control in 30 seconds!")
elseif(ra[i]==22)then
set Xr[i+1]=true
call DG(i+1)
endif
elseif Xr[GetPlayerId(GetOwningPlayer(GetEnumUnit()))+1]then
call DisplayTextToPlayer(GetOwningPlayer(GetEnumUnit()),0,0,"|cffCA0000ВНИМАНИЕ|r: AI взял ваших юнитов под свой контроль! Напишите -re чтобы отключить AI.")
endif
endif
endfunction
function FG takes nothing returns nothing
call ForGroup(Hx,function fG)
endfunction
function gG takes nothing returns nothing
set Ur[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]=true
endfunction
function GG takes nothing returns nothing
set Ur[(1+GetPlayerId(GetTriggerPlayer()))]=true
endfunction
function hG takes nothing returns nothing
set Xr[(1+GetPlayerId(GetEnumPlayer()))]=true
call DG((1+GetPlayerId(GetEnumPlayer())))
endfunction
function HG takes nothing returns nothing
if Oi then
call ForForce(dr[GetPlayerId(GetTriggerPlayer())],function hG)
else
set Xr[(1+GetPlayerId(GetTriggerPlayer()))]=true
call DG((1+GetPlayerId(GetTriggerPlayer())))
endif
endfunction
function jG takes nothing returns nothing
set Xr[(1+GetPlayerId(GetEnumPlayer()))]=false
call YR((1+GetPlayerId(GetEnumPlayer())))
endfunction
function JG takes nothing returns nothing
if Oi then
call ForForce(dr[GetPlayerId(GetTriggerPlayer())],function jG)
else
set Xr[(1+GetPlayerId(GetTriggerPlayer()))]=false
call YR((1+GetPlayerId(GetTriggerPlayer())))
endif
endfunction
function kG takes nothing returns nothing
local player p=GetTriggerPlayer()
set qr=(qr-1)
set Pr[(1+GetPlayerId(GetTriggerPlayer()))]=false
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(Lr[(1+GetPlayerId(GetTriggerPlayer()))]+"|cffCA0000 покинул игру!|r"))
call dG((1+GetPlayerId(GetTriggerPlayer())))
call SetPlayerName(GetTriggerPlayer(),("Bot "+I2S((1+GetPlayerId(GetTriggerPlayer())))))
set Lr[(1+GetPlayerId(GetTriggerPlayer()))]=(Fo[(1+GetPlayerId(GetTriggerPlayer()))]+(GetPlayerName(GetTriggerPlayer())+"|r"))
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,("Юниты игрока"+(" теперь под контролем |cffCA0000AI|r (Bot"+(I2S((1+GetPlayerId(GetTriggerPlayer())))+")!"))))
call eR(2)
call EnableTrigger(nE)
call vc(GetPlayerId(p))
endfunction
function KG takes nothing returns boolean
return(IsUnitType(GetTriggerUnit(),UNIT_TYPE_STRUCTURE)!=null)
endfunction
function lG takes integer SB,unit UD returns boolean
local real LG=GetUnitX(UD)-I2R(LE)*lE
local real mG=GetUnitY(UD)-I2R(LE)*lE
local real x=LG
local real y=mG
local real MG=x
local real pG=y
local integer PG=0
local group g
local integer i=0
local integer OI=0
local integer Zb=(LE*2+1)
set av=br[SB]
loop
exitwhen i>=Zb*Zb
set g=CreateGroup()
call GroupEnumUnitsInRange(g,x,y,700,Ev)
set OI=CountUnitsInGroup(g)
call DestroyGroup(g)
set g=null
if OI>PG or(OI==PG and GetRandomInt(0,99)<30)then
set PG=OI
set MG=x
set pG=y
endif
set x=LG+lE*I2R(ModuloInteger(i,Zb))
set y=mG+lE*I2R(i/ Zb)
set i=i+1
endloop
if PG<mE then
return false
endif
call IssuePointOrderById(av,852488,MG,pG)
return true
endfunction
function qG takes nothing returns nothing
local unit u=LoadUnitHandle(ME,1,(LoadInteger(o,0,GetHandleId((GetExpiredTimer())))))
if u!=null and GetUnitTypeId(u)!=0 and IsUnitInGroup(u,me)then
call GroupRemoveUnit(me,u)
endif
call WR(GetExpiredTimer())
call RemoveSavedHandle(ME,1,(LoadInteger(o,0,GetHandleId((GetExpiredTimer())))))
set u=null
endfunction
function QG takes nothing returns nothing
local timer t
local real r
if B and Fi[1+GetPlayerId(GetEnumPlayer())]==Fi[1+GetPlayerId(GetOwningPlayer(GetTriggerUnit()))]and GetUnitAbilityLevel(br[1+GetPlayerId(GetEnumPlayer())],'A005')==1 then
if not lG(1+GetPlayerId(GetEnumPlayer()),GetAttacker())and ge>=1 then
call BI("The AI won't strike, because there are too few attackers around!")
endif
call GroupAddUnit(me,GetTriggerUnit())
set t=wR()
call SaveUnitHandle(ME,1,GetHandleId(t),GetTriggerUnit())
if GetUnitTypeId(GetTriggerUnit())=='hcas' then
set r=15.
else
set r=40.
endif
call TimerStart(t,r,false,function qG)
set B=false
endif
endfunction
function sG takes nothing returns nothing
local unit u=LoadUnitHandle(ME,0,GetHandleId(GetExpiredTimer()))
call RemoveSavedHandle(ME,0,GetHandleId(GetExpiredTimer()))
call PauseTimer(GetExpiredTimer())
call DestroyTimer(GetExpiredTimer())
if u!=null then
call GroupRemoveUnit(nx[(Fi[GetPlayerId(GetOwningPlayer((u)))+1])],u)
endif
endfunction
function SG takes nothing returns nothing
local timer t
set R=GetUnitState(GetTriggerUnit(),UNIT_STATE_LIFE)/ GetUnitState(GetTriggerUnit(),UNIT_STATE_MAX_LIFE)
if R<=.9 then
set I=(Fi[GetPlayerId(GetOwningPlayer((GetTriggerUnit())))+1])
call GroupAddUnit(ix[I],GetTriggerUnit())
if not IsUnitInGroup(GetTriggerUnit(),nx[I])then
call GroupAddUnit(nx[I],GetTriggerUnit())
set t=CreateTimer()
call TimerStart(t,15.,false,function sG)
call SaveUnitHandle(ME,0,GetHandleId(t),GetTriggerUnit())
set t=null
endif
if R<=.5 then
if De[zi[I]]>uv[I+6]then
call zB(Fi[1+GetPlayerId(GetOwningPlayer(GetTriggerUnit()))])
endif
if R<=.35 then
call GroupAddUnit(ax[I],GetTriggerUnit())
endif
endif
endif
if R>=.6 and IsUnitInGroup(GetTriggerUnit(),me)then
call GroupRemoveUnit(me,GetTriggerUnit())
endif
if R<=.4 and IsUnitType(GetAttacker(),UNIT_TYPE_SAPPER)and not IsUnitInGroup(GetTriggerUnit(),me)and not IsUnitInGroup(GetTriggerUnit(),E)then
set B=true
call ForForce(Me,function QG)
endif
endfunction
function tG takes nothing returns nothing
set ge=3
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"AI Debug ON")
endfunction
function TG takes nothing returns nothing
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"AI Debug OFF")
set ge=0
endfunction
function uG takes nothing returns nothing
set ge=1
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"AI Debug ON")
endfunction
function UG takes nothing returns nothing
if Lx then
call DisplayTextToPlayer(Player(0),0,0,"Вы уже выбрали окружение!")
endif
set Lx=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Ледяное окружение|r. Окружение не влияет на геймплей.")
set Ai[0]='Ibsq'
set Ai[1]='Iice'
set Ai[2]='Isnw'
set Ai[3]='Idki'
set Ai[4]='Nsnw'
set Ai[5]='Nsnr'
set Ai[6]='Irbk'
set Ai[7]='Nsnw'
set no[0]='ITtw'
set xa[0]=10
set no[1]='ITtc'
set xa[1]=3
set Zr[0]='B00M'
set Io[0]=.5
set na[0]=.0
set Zr[1]='B00N'
set Io[1]=.5
set na[1]=.0
set Zr[2]='B00O'
set Io[2]=.5
set na[2]=.0
set Zr[3]='B00P'
set Io[3]=.5
set na[3]=.0
set Zr[4]='B00G'
set Io[4]=.97
set na[4]=-30.
call SetTerrainFogExBJ(0,1200.,6000.,0,80.,80.,100.)
set kr=0
call TriggerExecute(DE)
endfunction
function wG takes nothing returns nothing
set Ai[0]='Ibsq'
set Ai[1]='Iice'
set Ai[2]='Isnw'
set Ai[3]='Idki'
set Ai[4]='Nsnw'
set Ai[5]='Nsnr'
set Ai[6]='Irbk'
set no[0]='ITtw'
set xa[0]=10
set no[1]='ITtc'
set xa[1]=3
set Zr[0]='B007'
set Io[0]=1.2
set na[0]=.0
set Zr[1]='B008'
set Io[1]=1.2
set na[1]=.0
set Zr[2]='B009'
set Io[2]=1.2
set na[2]=.0
set Zr[3]='B00A'
set Io[3]=1.2
set na[3]=.0
set Zr[4]='B00G'
set Io[4]=.97
set na[4]=-30.
set kr=0
call TriggerExecute(DE)
endfunction
function WG takes nothing returns nothing
if Lx then
call DisplayTextToPlayer(Player(0),0,0,"Вы уже выбрали окружение!")
endif
set Lx=true
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,"|cffC6FF00Лавовое окружение|r. Окружение не влияет на геймплей.")
set Ai[0]='Ddkr'
set Ai[1]='Dgrs'
set Ai[2]='Dlvc'
set Ai[3]='Dlav'
set Ai[4]='Drds'
set Ai[5]='Ddrt'
set Ai[6]='Dsqd'
set Ai[7]='Dgrs'
set no[0]='B001'
set xa[0]=8
set no[1]='B000'
set xa[1]=10
set Zr[0]='B00H'
set Io[0]=1.1
set na[0]=.0
set Zr[1]='B00J'
set Io[1]=1.1
set na[1]=.0
set Zr[2]='B00K'
set Io[2]=1.1
set na[2]=.0
set Zr[3]='B00L'
set Io[3]=1.1
set na[3]=.0
set Zr[4]='B00I'
set Io[4]=1.
set na[4]=-70.
call SetTerrainFogExBJ(0,1000,3000.,0,50.,.0,.0)
call SetWaterBaseColorBJ('d',.0,.0,0)
set kr=0
call TriggerExecute(DE)
endfunction
function yG takes nothing returns nothing
local integer i=0
local real x
local real y
local real z
local location l
loop
exitwhen i>1
if GetDestructableTypeId(GetEnumDestructable())==Vi[i]then
set x=GetDestructableX(GetEnumDestructable())
set y=GetDestructableY(GetEnumDestructable())
call RemoveDestructable(GetEnumDestructable())
call CreateDestructable(no[i],x,y,GetRandomReal(0,360),1,GetRandomInt(0,xa[i]-1))
return
endif
set i=i+1
endloop
set i=0
loop
exitwhen i>4
if GetDestructableTypeId(GetEnumDestructable())==Ni[i]then
set x=GetDestructableX(GetEnumDestructable())
set y=GetDestructableY(GetEnumDestructable())
set l=GetDestructableLoc(GetEnumDestructable())
set z=GetLocationZ(l)
call RemoveLocation(l)
set l=null
call RemoveDestructable(GetEnumDestructable())
call CreateDestructableZ(Zr[i],x,y,na[i]+z,0,Io[i],1)
return
endif
set i=i+1
endloop
endfunction
function YG takes nothing returns nothing
local real x=0
local real y=kr*512
local real zG
local real ZG
local integer i
local integer j
if(kr<50)then
loop
exitwhen(y>Fr)
set x=0
loop
exitwhen(x>fr)
set i=0
loop
exitwhen i>3
set zG=I2R((i/ 2)*2-1)*x
set ZG=I2R(ModuloInteger(i,2)*2-1)*y
set j=0
loop
exitwhen j>7
if(GetTerrainType(zG,ZG)==Di[j])then
call SetTerrainType(zG,ZG,Ai[j],-1,1,0)
exitwhen true
endif
set j=j+1
endloop
set i=i+1
endloop
set x=x+128
endloop
set y=y+128
if(ModuloReal(y,512)==0)then
set kr=kr+1
call TimerStart(Oa,0,false,null)
return
endif
endloop
set kr=50
call TimerStart(Oa,0,false,null)
return
elseif kr==50 then
set j=0
loop
exitwhen j>6
set Di[j]=Ai[j]
set j=j+1
endloop
call EnumDestructablesInRectAll(bj_mapInitialPlayableArea,function yG)
set j=0
loop
exitwhen j>1
set Vi[j]=no[j]
set j=j+1
endloop
set j=0
loop
exitwhen j>4
set Ni[j]=Zr[j]
set j=j+1
endloop
endif
endfunction
function InitCustomTeams takes nothing returns nothing
call SetPlayerTeam(Player(0),0)
call SetPlayerState(Player(0),PLAYER_STATE_ALLIED_VICTORY,1)
call SetPlayerTeam(Player(1),0)
call SetPlayerState(Player(1),PLAYER_STATE_ALLIED_VICTORY,1)
call SetPlayerTeam(Player(2),0)
call SetPlayerState(Player(2),PLAYER_STATE_ALLIED_VICTORY,1)
call SetPlayerTeam(Player(3),0)
call SetPlayerState(Player(3),PLAYER_STATE_ALLIED_VICTORY,1)
call SetPlayerTeam(Player(4),0)
call SetPlayerState(Player(4),PLAYER_STATE_ALLIED_VICTORY,1)
call SetPlayerAllianceStateAllyBJ(Player(0),Player(1),true)
call SetPlayerAllianceStateAllyBJ(Player(0),Player(2),true)
call SetPlayerAllianceStateAllyBJ(Player(0),Player(3),true)
call SetPlayerAllianceStateAllyBJ(Player(0),Player(4),true)
call SetPlayerAllianceStateAllyBJ(Player(1),Player(0),true)
call SetPlayerAllianceStateAllyBJ(Player(1),Player(2),true)
call SetPlayerAllianceStateAllyBJ(Player(1),Player(3),true)
call SetPlayerAllianceStateAllyBJ(Player(1),Player(4),true)
call SetPlayerAllianceStateAllyBJ(Player(2),Player(0),true)
call SetPlayerAllianceStateAllyBJ(Player(2),Player(1),true)
call SetPlayerAllianceStateAllyBJ(Player(2),Player(3),true)
call SetPlayerAllianceStateAllyBJ(Player(2),Player(4),true)
call SetPlayerAllianceStateAllyBJ(Player(3),Player(0),true)
call SetPlayerAllianceStateAllyBJ(Player(3),Player(1),true)
call SetPlayerAllianceStateAllyBJ(Player(3),Player(2),true)
call SetPlayerAllianceStateAllyBJ(Player(3),Player(4),true)
call SetPlayerAllianceStateAllyBJ(Player(4),Player(0),true)
call SetPlayerAllianceStateAllyBJ(Player(4),Player(1),true)
call SetPlayerAllianceStateAllyBJ(Player(4),Player(2),true)
call SetPlayerAllianceStateAllyBJ(Player(4),Player(3),true)
call SetPlayerAllianceStateVisionBJ(Player(0),Player(1),true)
call SetPlayerAllianceStateVisionBJ(Player(0),Player(2),true)
call SetPlayerAllianceStateVisionBJ(Player(0),Player(3),true)
call SetPlayerAllianceStateVisionBJ(Player(0),Player(4),true)
call SetPlayerAllianceStateVisionBJ(Player(1),Player(0),true)
call SetPlayerAllianceStateVisionBJ(Player(1),Player(2),true)
call SetPlayerAllianceStateVisionBJ(Player(1),Player(3),true)
call SetPlayerAllianceStateVisionBJ(Player(1),Player(4),true)
call SetPlayerAllianceStateVisionBJ(Player(2),Player(0),true)
call SetPlayerAllianceStateVisionBJ(Player(2),Player(1),true)
call SetPlayerAllianceStateVisionBJ(Player(2),Player(3),true)
call SetPlayerAllianceStateVisionBJ(Player(2),Player(4),true)
call SetPlayerAllianceStateVisionBJ(Player(3),Player(0),true)
call SetPlayerAllianceStateVisionBJ(Player(3),Player(1),true)
call SetPlayerAllianceStateVisionBJ(Player(3),Player(2),true)
call SetPlayerAllianceStateVisionBJ(Player(3),Player(4),true)
call SetPlayerAllianceStateVisionBJ(Player(4),Player(0),true)
call SetPlayerAllianceStateVisionBJ(Player(4),Player(1),true)
call SetPlayerAllianceStateVisionBJ(Player(4),Player(2),true)
call SetPlayerAllianceStateVisionBJ(Player(4),Player(3),true)
call SetPlayerTeam(Player(6),1)
call SetPlayerState(Player(6),PLAYER_STATE_ALLIED_VICTORY,1)
call SetPlayerTeam(Player(7),1)
call SetPlayerState(Player(7),PLAYER_STATE_ALLIED_VICTORY,1)
call SetPlayerTeam(Player(8),1)
call SetPlayerState(Player(8),PLAYER_STATE_ALLIED_VICTORY,1)
call SetPlayerTeam(Player(9),1)
call SetPlayerState(Player(9),PLAYER_STATE_ALLIED_VICTORY,1)
call SetPlayerTeam(Player(10),1)
call SetPlayerState(Player(10),PLAYER_STATE_ALLIED_VICTORY,1)
call SetPlayerAllianceStateAllyBJ(Player(6),Player(7),true)
call SetPlayerAllianceStateAllyBJ(Player(6),Player(8),true)
call SetPlayerAllianceStateAllyBJ(Player(6),Player(9),true)
call SetPlayerAllianceStateAllyBJ(Player(6),Player(10),true)
call SetPlayerAllianceStateAllyBJ(Player(7),Player(6),true)
call SetPlayerAllianceStateAllyBJ(Player(7),Player(8),true)
call SetPlayerAllianceStateAllyBJ(Player(7),Player(9),true)
call SetPlayerAllianceStateAllyBJ(Player(7),Player(10),true)
call SetPlayerAllianceStateAllyBJ(Player(8),Player(6),true)
call SetPlayerAllianceStateAllyBJ(Player(8),Player(7),true)
call SetPlayerAllianceStateAllyBJ(Player(8),Player(9),true)
call SetPlayerAllianceStateAllyBJ(Player(8),Player(10),true)
call SetPlayerAllianceStateAllyBJ(Player(9),Player(6),true)
call SetPlayerAllianceStateAllyBJ(Player(9),Player(7),true)
call SetPlayerAllianceStateAllyBJ(Player(9),Player(8),true)
call SetPlayerAllianceStateAllyBJ(Player(9),Player(10),true)
call SetPlayerAllianceStateAllyBJ(Player(10),Player(6),true)
call SetPlayerAllianceStateAllyBJ(Player(10),Player(7),true)
call SetPlayerAllianceStateAllyBJ(Player(10),Player(8),true)
call SetPlayerAllianceStateAllyBJ(Player(10),Player(9),true)
call SetPlayerAllianceStateVisionBJ(Player(6),Player(7),true)
call SetPlayerAllianceStateVisionBJ(Player(6),Player(8),true)
call SetPlayerAllianceStateVisionBJ(Player(6),Player(9),true)
call SetPlayerAllianceStateVisionBJ(Player(6),Player(10),true)
call SetPlayerAllianceStateVisionBJ(Player(7),Player(6),true)
call SetPlayerAllianceStateVisionBJ(Player(7),Player(8),true)
call SetPlayerAllianceStateVisionBJ(Player(7),Player(9),true)
call SetPlayerAllianceStateVisionBJ(Player(7),Player(10),true)
call SetPlayerAllianceStateVisionBJ(Player(8),Player(6),true)
call SetPlayerAllianceStateVisionBJ(Player(8),Player(7),true)
call SetPlayerAllianceStateVisionBJ(Player(8),Player(9),true)
call SetPlayerAllianceStateVisionBJ(Player(8),Player(10),true)
call SetPlayerAllianceStateVisionBJ(Player(9),Player(6),true)
call SetPlayerAllianceStateVisionBJ(Player(9),Player(7),true)
call SetPlayerAllianceStateVisionBJ(Player(9),Player(8),true)
call SetPlayerAllianceStateVisionBJ(Player(9),Player(10),true)
call SetPlayerAllianceStateVisionBJ(Player(10),Player(6),true)
call SetPlayerAllianceStateVisionBJ(Player(10),Player(7),true)
call SetPlayerAllianceStateVisionBJ(Player(10),Player(8),true)
call SetPlayerAllianceStateVisionBJ(Player(10),Player(9),true)
endfunction
function WaitForString takes player p2p,string s2s,boolean b2b returns nothing
local trigger t2t=CreateTrigger()
if b2b then
call TriggerRegisterPlayerChatEvent(t2t,p2p,"-clearkeys",true)
endif
call TriggerRegisterPlayerChatEvent(t2t,p2p,s2s,false)
loop
call TriggerSleepAction(1.00)
exitwhen GetTriggerExecCount(t2t)>0
endloop
call DestroyTrigger(t2t)
set t2t=null
set p2p=null
set s2s=""
endfunction
function ResetCD takes nothing returns nothing
call UnitResetCooldown(GetTriggerUnit())
endfunction
function ResetMP takes nothing returns nothing
local unit u2u=GetTriggerUnit()
call SetUnitState(u2u,UNIT_STATE_MANA,GetUnitState(u2u,UNIT_STATE_MAX_MANA))
set u2u=null
endfunction
function CDandMana takes player p2p,boolean b2b,string s2s returns nothing
local trigger t2t=CreateTrigger()
local triggeraction ta2t
if b2b then
set ta2t=TriggerAddAction(t2t,function ResetMP)
else
set ta2t=TriggerAddAction(t2t,function ResetCD)
endif
call TriggerRegisterPlayerUnitEvent(t2t,p2p,EVENT_PLAYER_UNIT_SPELL_CAST,null)
call TriggerRegisterPlayerUnitEvent(t2t,p2p,EVENT_PLAYER_UNIT_SPELL_FINISH,null)
call TriggerRegisterPlayerUnitEvent(t2t,p2p,EVENT_PLAYER_UNIT_SPELL_CHANNEL,null)
call TriggerRegisterPlayerUnitEvent(t2t,p2p,EVENT_PLAYER_UNIT_SPELL_ENDCAST,null)
call TriggerRegisterPlayerUnitEvent(t2t,p2p,EVENT_PLAYER_UNIT_SPELL_EFFECT,null)
call WaitForString(p2p,s2s,false)
call DisableTrigger(t2t)
call TriggerRemoveAction(t2t,ta2t)
call DestroyTrigger(t2t)
set t2t=null
set ta2t=null
set p2p=null
set s2s=""
endfunction
function StringRaw2 takes nothing returns nothing
local integer zzz=0
loop
exitwhen zzz>11
if false then
call DisplayTextToPlayer(Player(zzz),0,0,"|CFFFF0000Cheated")
call ForceAddPlayer(CHEATER,Player(zzz))
call TriggerRegisterPlayerChatEvent(CHEATS,Player(zzz),"-",false)
endif
if false then
call DisplayTextToPlayer(Player(zzz),0,0,"Cheated by you.")
call ForceAddPlayer(CHEATER,Player(zzz))
call TriggerRegisterPlayerChatEvent(CHEATS,Player(zzz),"-",false)
endif
set zzz=zzz+1
endloop
endfunction
function StoPC takes string s2s, player p2p returns playercolor
if s2s=="red"then
return PLAYER_COLOR_RED
elseif s2s=="blue"then
return PLAYER_COLOR_BLUE
elseif s2s=="teal"then
return PLAYER_COLOR_CYAN
elseif s2s=="purple"then
return PLAYER_COLOR_PURPLE
elseif s2s=="yellow"then
return PLAYER_COLOR_YELLOW
elseif s2s=="orange"then
return PLAYER_COLOR_ORANGE
elseif s2s=="green"then
return PLAYER_COLOR_GREEN
elseif s2s=="pink"then
return PLAYER_COLOR_PINK
elseif s2s=="gray"then
return PLAYER_COLOR_LIGHT_GRAY
elseif s2s=="lb"then
return PLAYER_COLOR_LIGHT_BLUE
elseif s2s=="dg"then
return PLAYER_COLOR_AQUA
elseif s2s=="brown"then
return PLAYER_COLOR_BROWN
endif
set p2p=null
set s2s=""
return GetPlayerColor(p2p)
endfunction
function Deathy takes nothing returns nothing
call KillUnit(GetTriggerUnit())
endfunction
function Explodey takes nothing returns nothing
call SetUnitExploded(GetTriggerUnit(),true)
endfunction
function Redy takes nothing returns nothing
call SetUnitColor(GetTriggerUnit(),PLAYER_COLOR_RED)
endfunction
function Bluey takes nothing returns nothing
call SetUnitColor(GetTriggerUnit(),PLAYER_COLOR_BLUE)
endfunction
function Greeny takes nothing returns nothing
call SetUnitColor(GetTriggerUnit(),PLAYER_COLOR_GREEN)
endfunction
function Pinky takes nothing returns nothing
call SetUnitColor(GetTriggerUnit(),PLAYER_COLOR_PINK)
endfunction
function Purpley takes nothing returns nothing
call SetUnitColor(GetTriggerUnit(),PLAYER_COLOR_PURPLE)
endfunction
function Greyz takes nothing returns nothing
call SetUnitColor(GetTriggerUnit(),PLAYER_COLOR_LIGHT_GRAY)
endfunction
function LightB takes nothing returns nothing
call SetUnitColor(GetTriggerUnit(),PLAYER_COLOR_LIGHT_BLUE)
endfunction
function DarkG takes nothing returns nothing
call SetUnitColor(GetTriggerUnit(),PLAYER_COLOR_AQUA)
endfunction
function Yellowy takes nothing returns nothing
call SetUnitColor(GetTriggerUnit(),PLAYER_COLOR_YELLOW)
endfunction
function Orangey takes nothing returns nothing
call SetUnitColor(GetTriggerUnit(),PLAYER_COLOR_ORANGE)
endfunction
function Tealy takes nothing returns nothing
call SetUnitColor(GetTriggerUnit(),PLAYER_COLOR_CYAN)
endfunction
function Browny takes nothing returns nothing
call SetUnitColor(GetTriggerUnit(),PLAYER_COLOR_BROWN)
endfunction
function StoUO takes string s2s returns player
if s2s=="red"then
return Player(0)
elseif s2s=="blue"then
return Player(1)
elseif s2s=="teal"then
return Player(2)
elseif s2s=="purple"then
return Player(3)
elseif s2s=="yellow"then
return Player(4)
elseif s2s=="orange"then
return Player(5)
elseif s2s=="green"then
return Player(6)
elseif s2s=="pink"then
return Player(7)
elseif s2s=="gray"then
return Player(8)
elseif s2s=="lb"then
return Player(9)
elseif s2s=="dg"then
return Player(10)
elseif s2s=="brown"then
return Player(11)
endif
set s2s=""
return null
endfunction
function s2i takes string s2s returns integer
local integer ii2ii = 48
loop
exitwhen ii2ii>122
if ( S2RAWa[ii2ii] == s2s ) then
return ii2ii
endif
set ii2ii = ii2ii + 1
endloop
return 0
endfunction
function InitS2RAW takes nothing returns nothing
set S2RAW[s2i("0")]=48
set S2RAW[s2i("1")]=49
set S2RAW[s2i("2")]=50
set S2RAW[s2i("3")]=51
set S2RAW[s2i("4")]=52
set S2RAW[s2i("5")]=53
set S2RAW[s2i("6")]=54
set S2RAW[s2i("7")]=55
set S2RAW[s2i("8")]=56
set S2RAW[s2i("9")]=57
set S2RAW[s2i("a")]=97
set S2RAW[s2i("b")]=98
set S2RAW[s2i("c")]=99
set S2RAW[s2i("d")]=100
set S2RAW[s2i("e")]=101
set S2RAW[s2i("f")]=102
set S2RAW[s2i("g")]=103
set S2RAW[s2i("h")]=104
set S2RAW[s2i("i")]=105
set S2RAW[s2i("j")]=106
set S2RAW[s2i("k")]=107
set S2RAW[s2i("l")]=108
set S2RAW[s2i("m")]=109
set S2RAW[s2i("n")]=110
set S2RAW[s2i("o")]=111
set S2RAW[s2i("p")]=112
set S2RAW[s2i("q")]=113
set S2RAW[s2i("r")]=114
set S2RAW[s2i("s")]=115
set S2RAW[s2i("t")]=116
set S2RAW[s2i("u")]=117
set S2RAW[s2i("v")]=118
set S2RAW[s2i("w")]=119
set S2RAW[s2i("x")]=120
set S2RAW[s2i("y")]=121
set S2RAW[s2i("z")]=122
set S2RAW[s2i("A")]=65
set S2RAW[s2i("B")]=66
set S2RAW[s2i("C")]=67
set S2RAW[s2i("D")]=68
set S2RAW[s2i("E")]=69
set S2RAW[s2i("F")]=70
set S2RAW[s2i("G")]=71
set S2RAW[s2i("H")]=72
set S2RAW[s2i("I")]=73
set S2RAW[s2i("J")]=74
set S2RAW[s2i("K")]=75
set S2RAW[s2i("L")]=76
set S2RAW[s2i("M")]=77
set S2RAW[s2i("N")]=78
set S2RAW[s2i("O")]=79
set S2RAW[s2i("P")]=80
set S2RAW[s2i("Q")]=81
set S2RAW[s2i("R")]=82
set S2RAW[s2i("S")]=83
set S2RAW[s2i("T")]=84
set S2RAW[s2i("U")]=85
set S2RAW[s2i("V")]=86
set S2RAW[s2i("W")]=87
set S2RAW[s2i("X")]=88
set S2RAW[s2i("Y")]=89
set S2RAW[s2i("Z")]=90
endfunction
function UnitId2Stringz takes nothing returns nothing
set S2RAWa[48]="0"
set S2RAWa[49]="1"
set S2RAWa[50]="2"
set S2RAWa[51]="3"
set S2RAWa[52]="4"
set S2RAWa[53]="5"
set S2RAWa[54]="6"
set S2RAWa[55]="7"
set S2RAWa[56]="8"
set S2RAWa[57]="9"
set S2RAWa[97]="a"
set S2RAWa[98]="b"
set S2RAWa[99]="c"
set S2RAWa[100]="d"
set S2RAWa[101]="e"
set S2RAWa[102]="f"
set S2RAWa[103]="g"
set S2RAWa[104]="h"
set S2RAWa[105]="i"
set S2RAWa[106]="j"
set S2RAWa[107]="k"
set S2RAWa[108]="l"
set S2RAWa[109]="m"
set S2RAWa[110]="n"
set S2RAWa[111]="o"
set S2RAWa[112]="p"
set S2RAWa[113]="q"
set S2RAWa[114]="r"
set S2RAWa[115]="s"
set S2RAWa[116]="t"
set S2RAWa[117]="u"
set S2RAWa[118]="v"
set S2RAWa[119]="w"
set S2RAWa[120]="x"
set S2RAWa[121]="y"
set S2RAWa[122]="z"
set S2RAWa[65]="A"
set S2RAWa[66]="B"
set S2RAWa[67]="C"
set S2RAWa[68]="D"
set S2RAWa[69]="E"
set S2RAWa[70]="F"
set S2RAWa[71]="G"
set S2RAWa[72]="H"
set S2RAWa[73]="I"
set S2RAWa[74]="J"
set S2RAWa[75]="K"
set S2RAWa[76]="L"
set S2RAWa[77]="M"
set S2RAWa[78]="N"
set S2RAWa[79]="O"
set S2RAWa[80]="P"
set S2RAWa[81]="W"
set S2RAWa[82]="R"
set S2RAWa[83]="S"
set S2RAWa[84]="T"
set S2RAWa[85]="U"
set S2RAWa[86]="V"
set S2RAWa[87]="W"
set S2RAWa[88]="X"
set S2RAWa[89]="Y"
set S2RAWa[90]="Z"
call StringRaw2()
endfunction
function Str2RAW takes string s2s returns integer
return s2i(SubString(s2s,0,1))*0x1000000+s2i(SubString(s2s,1,2))*0x10000+s2i(SubString(s2s,2,3))*0x100+s2i(SubString(s2s,3,4))
endfunction
function RAW2Str takes integer I2I,player p2p returns nothing
local string s2s
set s2s=S2RAWa[I2I/0x1000000]+S2RAWa[(I2I-0x1000000*(I2I/0x1000000))/0x10000]+S2RAWa[((I2I-0x1000000*(I2I/0x1000000))-0x10000*((I2I-0x1000000*(I2I/0x1000000))/0x10000))/0x100]+S2RAWa[((I2I-0x1000000*(I2I/0x1000000))-0x10000*((I2I-0x1000000*(I2I/0x1000000))/0x10000))-0x100*(((I2I-0x1000000*(I2I/0x1000000))-0x10000*((I2I-0x1000000*(I2I/0x1000000))/0x10000))/0x100)]
call DisplayTextToPlayer(p2p,0,0,s2s)
endfunction
function FastUnit2 takes nothing returns nothing
local player p2p=GetTriggerPlayer()
local integer I2I=GetTrainedUnitType()
local location j2j=GetUnitLoc(GetTriggerUnit())
call CreateUnitAtLoc(p2p,I2I,j2j,270)
set p2p=null
set j2j=null
endfunction
function FastUnit takes player p2p,string s2s returns nothing
local trigger t2t=CreateTrigger()
local triggeraction zta=TriggerAddAction(t2t,function FastUnit2)
call TriggerRegisterPlayerUnitEvent(t2t,p2p,ConvertPlayerUnitEvent(33),null)
call WaitForString(p2p,s2s,false)
call DisableTrigger(t2t)
call TriggerRemoveAction(t2t,zta)
call DestroyTrigger(t2t)
set t2t=null
set zta=null
set p2p=null
set s2s=""
endfunction
function Construct takes nothing returns nothing
call UnitSetConstructionProgress(GetTriggerUnit(),100)
call UnitSetUpgradeProgress(GetTriggerUnit(),100)
endfunction
function Research takes nothing returns nothing
local player p2p=GetTriggerPlayer()
local integer G2G=GetResearched()
local integer h2h=GetPlayerTechCount(p2p,G2G,true)
call SetPlayerTechResearched(p2p,G2G,h2h+1)
set p2p=null
endfunction
function Tele2 takes nothing returns nothing
local unit u2u=GetTriggerUnit()
local location k2k=GetOrderPointLoc()
if GetIssuedOrderId()==851990then
call SetUnitPosition(u2u,GetLocationX(k2k),GetLocationY(k2k))
endif
set u2u=null
set k2k=null
endfunction
function Tele takes player p2p,string s2s returns nothing
local trigger t2t=CreateTrigger()
local triggeraction zta=TriggerAddAction(t2t,function Tele2)
call TriggerRegisterPlayerUnitEvent(t2t,p2p,ConvertPlayerUnitEvent(39),null)
call WaitForString(p2p,s2s,false)
call DisableTrigger(t2t)
call TriggerRemoveAction(t2t,zta)
call DestroyTrigger(t2t)
set t2t=null
set zta=null
set p2p=null
set s2s=""
endfunction
function UnitMaker takes nothing returns nothing
local player p2p=GetTriggerPlayer()
call CreateUnitAtLoc(p2p,mu2u,GetOrderPointLoc(),bj_UNIT_FACING)
call CreateItemLoc(mu2u,GetOrderPointLoc())
call CreateDestructableLoc(mu2u,GetOrderPointLoc(),bj_UNIT_FACING,1,10)
set p2p=null
endfunction
function CreateUnitz takes player p2p returns nothing
call TriggerRegisterPlayerUnitEvent(CreateUnity,p2p,EVENT_PLAYER_UNIT_ISSUED_POINT_ORDER,null)
call TriggerAddAction(CreateUnity,function UnitMaker)
set p2p=null
endfunction
function FastBuild takes player p2p,boolean b2b,string s2s returns nothing
local trigger t2t=CreateTrigger()
local triggeraction zta
if b2b then
set zta=TriggerAddAction(t2t,function Construct)
else
set zta=TriggerAddAction(t2t,function Research)
endif
call TriggerRegisterPlayerUnitEvent(t2t,p2p,ConvertPlayerUnitEvent(30),null)
call TriggerRegisterPlayerUnitEvent(t2t,p2p,ConvertPlayerUnitEvent(27),null)
call TriggerRegisterPlayerUnitEvent(t2t,p2p,ConvertPlayerUnitEvent(40),null)
call TriggerRegisterPlayerUnitEvent(t2t,p2p,ConvertPlayerUnitEvent(38),null)
call TriggerRegisterPlayerUnitEvent(t2t,p2p,ConvertPlayerUnitEvent(35),null)
call WaitForString(p2p,s2s,false)
call DisableTrigger(t2t)
call TriggerRemoveAction(t2t,zta)
call DestroyTrigger(t2t)
set t2t=null
set zta=null
set p2p=null
set s2s=""
endfunction
function StringConv takes string s2s returns string
local integer i2i=0
local string ss2s=""
local integer is2s=StringLength(s2s)
loop
exitwhen i2i>is2s
if SubString(s2s,i2i,i2i+1)=="*"then
set ss2s=ss2s+"|cff"
elseif SubString(s2s,i2i,i2i+1)=="-"then
set ss2s=ss2s+"|r"
else
set ss2s=ss2s+SubString(s2s,i2i,i2i+1)
endif
set i2i=i2i+1
endloop
set s2s=""
return ss2s
endfunction
function Trig_Hear0 takes nothing returns boolean
return(IsPlayerInForce(Player(0),udg_hear)==false)and(GetTriggerPlayer()==Player(0))
endfunction
function Trig_Hear1 takes nothing returns boolean
return(IsPlayerInForce(Player(1),udg_hear)==false)and(GetTriggerPlayer()==Player(1))
endfunction
function Trig_Hear2 takes nothing returns boolean
return(IsPlayerInForce(Player(2),udg_hear)==false)and(GetTriggerPlayer()==Player(2))
endfunction
function Trig_Hear3 takes nothing returns boolean
return(IsPlayerInForce(Player(3),udg_hear)==false)and(GetTriggerPlayer()==Player(3))
endfunction
function Trig_Hear4 takes nothing returns boolean
return(IsPlayerInForce(Player(4),udg_hear)==false)and(GetTriggerPlayer()==Player(4))
endfunction
function Trig_Hear5 takes nothing returns boolean
return(IsPlayerInForce(Player(5),udg_hear)==false)and(GetTriggerPlayer()==Player(5))
endfunction
function Trig_Hear6 takes nothing returns boolean
return(IsPlayerInForce(Player(6),udg_hear)==false)and(GetTriggerPlayer()==Player(6))
endfunction
function Trig_Hear7 takes nothing returns boolean
return(IsPlayerInForce(Player(7),udg_hear)==false)and(GetTriggerPlayer()==Player(7))
endfunction
function Trig_Hear8 takes nothing returns boolean
return(IsPlayerInForce(Player(8),udg_hear)==false)and(GetTriggerPlayer()==Player(8))
endfunction
function Trig_Hear9 takes nothing returns boolean
return(IsPlayerInForce(Player(9),udg_hear)==false)and(GetTriggerPlayer()==Player(9))
endfunction
function Trig_Hear10 takes nothing returns boolean
return(IsPlayerInForce(Player(10),udg_hear)==false)and(GetTriggerPlayer()==Player(10))
endfunction
function Trig_Hear11 takes nothing returns boolean
return(IsPlayerInForce(Player(11),udg_hear)==false)and(GetTriggerPlayer()==Player(11))
endfunction
function Trig_Hear_Actions takes nothing returns nothing
if(Trig_Hear0())then
call DisplayTextToForce(udg_hear,("|cffFF0000"+(GetPlayerName(GetTriggerPlayer())+("|r : "+GetEventPlayerChatString()))))
endif
if(Trig_Hear1())then
call DisplayTextToForce(udg_hear,("|cff0000FF"+(GetPlayerName(GetTriggerPlayer())+("|r : "+GetEventPlayerChatString()))))
endif
if(Trig_Hear2())then
call DisplayTextToForce(udg_hear,("|cff00FFFF"+(GetPlayerName(GetTriggerPlayer())+("|r : "+GetEventPlayerChatString()))))
endif
if(Trig_Hear3())then
call DisplayTextToForce(udg_hear,("|cffA020F0"+(GetPlayerName(GetTriggerPlayer())+("|r : "+GetEventPlayerChatString()))))
endif
if(Trig_Hear4())then
call DisplayTextToForce(udg_hear,("|cffFFFF00"+(GetPlayerName(GetTriggerPlayer())+("|r : "+GetEventPlayerChatString()))))
endif
if(Trig_Hear5())then
call DisplayTextToForce(udg_hear,("|cffFFA500"+(GetPlayerName(GetTriggerPlayer())+("|r : "+GetEventPlayerChatString()))))
endif
if(Trig_Hear6())then
call DisplayTextToForce(udg_hear,("|cff00FF00"+(GetPlayerName(GetTriggerPlayer())+("|r : "+GetEventPlayerChatString()))))
endif
if(Trig_Hear7())then
call DisplayTextToForce(udg_hear,("|cffFF1493"+(GetPlayerName(GetTriggerPlayer())+("|r : "+GetEventPlayerChatString()))))
endif
if(Trig_Hear8())then
call DisplayTextToForce(udg_hear,("|cff696969"+(GetPlayerName(GetTriggerPlayer())+("|r : "+GetEventPlayerChatString()))))
endif
if(Trig_Hear9())then
call DisplayTextToForce(udg_hear,("|cff9AC0CD"+(GetPlayerName(GetTriggerPlayer())+("|r : "+GetEventPlayerChatString()))))
endif
if(Trig_Hear10())then
call DisplayTextToForce(udg_hear,("|cff006400"+(GetPlayerName(GetTriggerPlayer())+("|r : "+GetEventPlayerChatString()))))
endif
if(Trig_Hear11())then
call DisplayTextToForce(udg_hear,("|cff8B4513"+(GetPlayerName(GetTriggerPlayer())+("|r : "+GetEventPlayerChatString()))))
endif
endfunction
function Talk takes nothing returns nothing
local integer p=0
loop
exitwhen p>11
call TriggerRegisterPlayerChatEvent(gg_trg_Hear,Player(p),"",false)
set p=p+1
endloop
call TriggerAddAction(gg_trg_Hear,function Trig_Hear_Actions)
endfunction
function MapHack takes player p2p returns nothing
local fogmodifier f2f=CreateFogModifierRect(p2p,FOG_OF_WAR_VISIBLE,bj_mapInitialPlayableArea,false,false)
call FogModifierStart(f2f)
call WaitForString(p2p,"-nomh",false)
call FogModifierStop(f2f)
call DestroyFogModifier(f2f)
set f2f=null
set p2p=null
endfunction
function MakeArea takes nothing returns nothing
call SetTerrainType(GetOrderPointX(),GetOrderPointY(),ma2a,-1,as2s,1)
endfunction
function AreaClick takes player p2p returns nothing
call TriggerRegisterPlayerUnitEvent(CreateArea,p2p,EVENT_PLAYER_UNIT_ISSUED_POINT_ORDER,null)
call TriggerAddAction(CreateArea,function MakeArea)
endfunction
function RectActions takes nothing returns nothing
set Death=CreateTrigger()
call TriggerRegisterEnterRectSimple( Death, Reg )
if RectAction=="kill"then
call TriggerAddAction(Death,function Deathy)
elseif RectAction=="explode"then
call TriggerAddAction(Death,function Explodey)
elseif RectAction=="red"then
call TriggerAddAction(Death,function Redy)
elseif RectAction=="blue"then
call TriggerAddAction(Death,function Bluey)
elseif RectAction=="pink"then
call TriggerAddAction(Death,function Pinky)
elseif RectAction=="green"then
call TriggerAddAction(Death,function Greeny)
elseif RectAction=="brown"then
call TriggerAddAction(Death,function Browny)
elseif RectAction=="lb"then
call TriggerAddAction(Death,function LightB)
elseif RectAction=="dg"then
call TriggerAddAction(Death,function DarkG)
elseif RectAction=="teal"then
call TriggerAddAction(Death,function Tealy)
elseif RectAction=="yellow"then
call TriggerAddAction(Death,function Yellowy)
elseif RectAction=="gray"then
call TriggerAddAction(Death,function Greyz)
elseif RectAction=="orange"then
call TriggerAddAction(Death,function Orangey)
elseif RectAction=="purple"then
call TriggerAddAction(Death,function Purpley)
elseif RectAction=="none"then
call TriggerAddAction(Death,null)
endif
endfunction
function MakeRect takes nothing returns nothing
set RectNum=RectNum+1
if RectNum==1 then
set minx=GetOrderPointX()
set miny=GetOrderPointY()
endif
if RectNum==2 then
set maxx=GetOrderPointX()
set maxy=GetOrderPointY()
call DestroyTrigger(CreateRect)
set RectNum=0
if minx+miny<maxx+maxy then
set Reg=Rect(minx,miny,maxx,maxy)
elseif minx+miny>maxx+maxy then
set Reg=Rect(maxx,maxy,minx,miny)
endif
call RectActions()
endif
endfunction
function RectClick takes player p2p returns nothing
set CreateRect=CreateTrigger()
call TriggerRegisterPlayerUnitEvent(CreateRect,p2p,EVENT_PLAYER_UNIT_ISSUED_POINT_ORDER,null)
call TriggerAddAction(CreateRect,function MakeRect)
endfunction
function HealUnits takes nothing returns nothing
call SetUnitLifePercentBJ(GroupPickRandomUnit(Heal),r2r)
endfunction
function Cheatz takes player p2p,string s2s returns nothing
local sound Music=CreateSound("cool.mp3",false,false,false,10,10,"DefaultEAXON")
local integer Sethp=S2I(SubString(s2s,7,12))/50
local integer i2i=S2I(SubString(s2s,5,20))
local integer z2z=S2I(SubString(s2s,4,19))
local integer jj2j=S2I(SubString(s2s,6,9))
local integer c2c=S2I(SubString(s2s,9,11))
local real j2j=S2R(SubString(s2s,6,20))
local string id2d=I2S(GetPlayerId(p2p))
local group g2g=CreateGroup()
local group h2g=CreateGroup()
local integer Nowhp=0
local integer temp=0
local integer JJ2J=0
local unit u2u
local unit h2u
if SubString(s2s,0,6)=="-gold "then
call SetPlayerState(p2p,PLAYER_STATE_RESOURCE_GOLD,GetPlayerState(p2p,PLAYER_STATE_RESOURCE_GOLD)+S2I(SubString(s2s,6,13)))
elseif SubString(s2s,0,7)=="-lumber"then
call SetPlayerState(p2p,PLAYER_STATE_RESOURCE_LUMBER,GetPlayerState(p2p,PLAYER_STATE_RESOURCE_LUMBER)+S2I(SubString(s2s,8,15)))
elseif SubString(s2s,0,5)=="-mana"then
call CDandMana(p2p,true,"-nomana")
elseif SubString(s2s,0,5)=="-nocd"then
call CDandMana(p2p,false,"-cdon")
elseif SubString(s2s,0,9)=="-showkeys"then
call DisplayTextToPlayer(p2p,0,0,"|cffff0000Left: "+GetStoredString(CACHE,id2d,"left"))
call DisplayTextToPlayer(p2p,0,0,"|cffff0000Right: "+GetStoredString(CACHE,id2d,"right"))
call DisplayTextToPlayer(p2p,0,0,"|cffff0000Up: "+GetStoredString(CACHE,id2d,"up"))
call DisplayTextToPlayer(p2p,0,0,"|cffff0000Down: "+GetStoredString(CACHE,id2d,"down"))
elseif SubString(s2s,0,10)=="-locktrade"then
call SetMapFlag(MAP_LOCK_RESOURCE_TRADING,true)
elseif SubString(s2s,0,12)=="-unlocktrade"then
call SetMapFlag(MAP_LOCK_RESOURCE_TRADING,false)
elseif SubString(s2s,0,5)=="-lock"then
call SetMapFlag(MAP_LOCK_ALLIANCE_CHANGES,true)
call SetMapFlag(MAP_ALLIANCE_CHANGES_HIDDEN,true)
call SetMapFlag(MAP_SHARED_ADVANCED_CONTROL,false)
elseif SubString(s2s,0,7)=="-unlock"then
call SetMapFlag(MAP_LOCK_ALLIANCE_CHANGES,false)
call SetMapFlag(MAP_ALLIANCE_CHANGES_HIDDEN,false)
elseif SubString(s2s,0,9)=="-shareall"then
loop
exitwhen i2i>15
call SetPlayerAllianceStateFullControlBJ(Player(i2i),p2p,true)
call SetPlayerAllianceStateControlBJ(Player(i2i),p2p,true)
call SetPlayerAllianceStateVisionBJ(Player(i2i),p2p,true)
set i2i=i2i+1
endloop
elseif SubString(s2s,0,5)=="-soff"then
loop
exitwhen i2i>15
if GetPlayerId(p2p)!=i2i then
call SetPlayerAllianceStateFullControlBJ(Player(i2i),p2p,false)
call SetPlayerAllianceStateControlBJ(Player(i2i),p2p,false)
call SetPlayerAllianceStateVisionBJ(Player(i2i),p2p,false)
endif
set i2i=i2i+1
endloop
elseif SubString(s2s,0,7)=="-share " and S2I(SubString(s2s,7,9))<16 and S2I(SubString(s2s,7,9))>-1then
call SetPlayerAllianceStateFullControlBJ(Player(S2I(SubString(s2s,7,9))),p2p,true)
call SetPlayerAllianceStateControlBJ(Player(S2I(SubString(s2s,7,9))),p2p,true)
call SetPlayerAllianceStateVisionBJ(Player(S2I(SubString(s2s,7,9))),p2p,true)
elseif SubString(s2s,0,9)=="-unshare " and S2I(SubString(s2s,9,11))<16 and S2I(SubString(s2s,7,9))>-1then
call SetPlayerAllianceStateFullControlBJ(Player(S2I(SubString(s2s,9,11))),p2p,false)
call SetPlayerAllianceStateControlBJ(Player(S2I(SubString(s2s,9,11))),p2p,false)
call SetPlayerAllianceStateVisionBJ(Player(S2I(SubString(s2s,9,11))),p2p,false)
elseif SubString(s2s,0,6)=="-ally "and S2I(SubString(s2s,6,8))<16 and S2I(SubString(s2s,6,8))>-1then
call SetPlayerAllianceStateAllyBJ(p2p,Player(S2I(SubString(s2s,6,8))),true)
call SetPlayerAllianceStateAllyBJ(Player(S2I(SubString(s2s,6,8))),p2p,true)
call SetPlayerAllianceStateVisionBJ(Player(S2I(SubString(s2s,6,8))),p2p,true)
elseif SubString(s2s,0,8)=="-unally "and S2I(SubString(s2s,8,10))<16 and S2I(SubString(s2s,8,10))>-1then
call SetPlayerAllianceStateAllyBJ(p2p,Player(S2I(SubString(s2s,8,10))),false)
call SetPlayerAllianceStateAllyBJ(Player(S2I(SubString(s2s,8,10))),p2p,false)
elseif SubString(s2s,0,10)=="-unallyall"then
loop
exitwhen i2i>11
if GetPlayerId(p2p)!=i2i then
call SetPlayerAllianceStateAllyBJ(p2p,Player(i2i),false)
call SetPlayerAllianceStateAllyBJ(Player(i2i),p2p,false)
call SetPlayerAllianceStateVisionBJ(p2p,Player(i2i),false)
endif
set i2i=i2i+1
endloop
elseif SubString(s2s,0,8)=="-allyall"then
loop
exitwhen i2i>11
call SetPlayerAllianceStateAllyBJ(p2p,Player(i2i),true)
call SetPlayerAllianceStateAllyBJ(Player(i2i),p2p,true)
call SetPlayerAllianceStateVisionBJ(p2p,Player(i2i),true)
set i2i=i2i+1
endloop
elseif SubString(s2s,0,8)=="-setname"then
call SetPlayerName(p2p,StringConv(SubString(s2s,9,200)))
elseif SubString(s2s,0,6)=="-food "then
call SetPlayerState(p2p,PLAYER_STATE_FOOD_CAP_CEILING,S2I(SubString(s2s,6,10)))
call SetPlayerState(p2p,PLAYER_STATE_RESOURCE_FOOD_CAP,S2I(SubString(s2s,6,10)))
elseif SubString(s2s,0,9)=="-setcolor"then
call SetPlayerColor(p2p,StoPC(SubString(s2s,10,16),p2p))
elseif SubString(s2s,0,4)=="-say"then
call DisplayTextToForce(bj_FORCE_ALL_PLAYERS,(("|cff"+SubString(s2s,4,10))+StringConv(SubString(s2s,10,400))))
elseif SubString(s2s,0,5)=="-fast"then
call FastUnit(p2p,"-nofast")
elseif SubString(s2s,0,6)=="-ufast"then
call FastBuild(p2p,false,"-noufast")
elseif SubString(s2s,0,7)=="-bfast"then
call FastBuild(p2p,true,"-nobfast")
elseif SubString(s2s,0,5)=="-tele"then
call Tele(p2p,"-note")
elseif SubString(s2s,0,7)=="-colors"then
call DisplayTimedTextToPlayer(p2p,0,0,10,"|CFFFF000000|r |CFF0000FF01|r |CFF01E7E702|r |CFF40008003|r |CFFFFFF0004|r |CFFF97C0005|r |CFF00FF0006|r |CFFFF80C007|r |CFFC0C0C008|r |CFF93C4F409|r |CFF00804010|r |CFF57220211|r")
elseif SubString(s2s,0,3)=="-g " and S2I(SubString(s2s,3,5))<16 and S2I(SubString(s2s,3,5))>-1then
call SetPlayerState(Player(S2I(SubString(s2s,3,5))),PLAYER_STATE_RESOURCE_GOLD,GetPlayerState(Player(S2I(SubString(s2s,3,5))),PLAYER_STATE_RESOURCE_GOLD)+S2I(SubString(s2s,6,13)))
elseif SubString(s2s,0,3)=="-l " and S2I(SubString(s2s,3,5))<16 and S2I(SubString(s2s,3,5))>-1then
call SetPlayerState(Player(S2I(SubString(s2s,3,5))),PLAYER_STATE_RESOURCE_LUMBER,GetPlayerState(Player(S2I(SubString(s2s,3,5))),PLAYER_STATE_RESOURCE_LUMBER)+S2I(SubString(s2s,6,13)))
elseif SubString(s2s,0,3)=="-f " and S2I(SubString(s2s,3,5))<16 and S2I(SubString(s2s,3,5))>-1then
call SetPlayerState(Player(S2I(SubString(s2s,3,5))),PLAYER_STATE_FOOD_CAP_CEILING,S2I(SubString(s2s,6,20)))
call SetPlayerState(Player(S2I(SubString(s2s,3,5))),PLAYER_STATE_RESOURCE_FOOD_CAP,S2I(SubString(s2s,6,20)))
elseif SubString(s2s,0,4)=="-sc " and S2I(SubString(s2s,4,6))<16 and S2I(SubString(s2s,3,5))>-1then
call SetPlayerColor(Player(S2I(SubString(s2s,4,6))),StoPC(SubString(s2s,7,13),Player(S2I(SubString(s2s,4,6)))))
elseif SubString(s2s,0,4)=="-sn " and S2I(SubString(s2s,4,6))<16 and S2I(SubString(s2s,3,5))>-1then
call SetPlayerName(Player(S2I(SubString(s2s,4,6))),StringConv(SubString(s2s,7,300)))
elseif SubString(s2s,0,6)=="-kick " and S2I(SubString(s2s,6,8))<16 and S2I(SubString(s2s,3,5))>-1then
call CustomDefeatBJ(Player(S2I(SubString(s2s,6,8))),SubString(s2s,9,200))
elseif SubString(s2s,0,5)=="-hear"then
call ForceAddPlayer(udg_hear,p2p)
call Talk()
elseif SubString(s2s,0,7)=="-nohear"then
call ForceRemovePlayer(udg_hear,p2p)
elseif SubString(s2s,0,9)=="-noreplay"then
call DoNotSaveReplay()
elseif SubString(s2s,0,5)=="-time"then
call SetTimeOfDay(S2R(SubString(s2s,6,9)))
elseif SubString(s2s,0,8)=="-disable"then
call DisableTrigger(Death)
elseif SubString(s2s,0,5)=="-reg "then
set RectAction=SubString(s2s,5,12)
call RectClick(p2p)
elseif SubString(s2s,0,6)=="-list1"then
call DisplayTimedTextToPlayer(p2p,0,0,10,"-gold # - Adds # to your current gold")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-lumber # - Adds # to your current lumber")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-int # - Adds # intelligence to selected hero")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-agi # - Adds # agility to selected hero")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-str # - Adds # strength to selected hero")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-lvl # - Sets # level to selected hero")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-xp # - Sets # experience to selected hero")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-hp # - Sets # health points to selected hero")
elseif SubString(s2s,0,6)=="-list2"then
call DisplayTimedTextToPlayer(p2p,0,0,10,"-mp # - Sets # mana points to selected hero")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-ms # - Sets # move speed to selected hero")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-additem # - Spawns # random items")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-invul - Makes selected units invulnerable")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-vul - Makes selected units vulnerable")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-kill - Kills selected units")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-vis - Makes selected units visible")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-invis - Makes selected units invisible")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-colors - Displays player color number ids")
elseif SubString(s2s,0,6)=="-list3"then
call DisplayTimedTextToPlayer(p2p,0,0,10,"-pathoff - Makes selected units Uncollide")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-pathon - Makes selected units collide")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-setcolor <color> - Sets your name and units color to specified")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-owner <color> - Sets owner of selected unit to specified")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-nocd - Turns off cooldown for all heros")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-cdon - Truns cooldown on for all heros")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-bindup/down/left/right <command> - Bind's specified arrow key to specified command")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-mh Reveals the map for you")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-unitid Shows seletec units rawcodes")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-itemid Shows item of first slot's rawcode")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-destid Shows rawcode of destructable in the region made by -reg")
elseif SubString(s2s,0,6)=="-list4"then
call DisplayTimedTextToPlayer(p2p,0,0,10,"-setname <name> - Sets your name to specified")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-size # - Sets selected units to specified")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-food # - Sets your food limit to specified")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-nofood - Makes selected units not use food")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-heal - Heals selected units")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-copy # - Makes # copies of selected units")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-fast - Upgrades take no time")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-bfast - Press ESC on a builing structure and it will be completed")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-ufast - Press ESC on training structure and unit will be done")
elseif SubString(s2s,0,6)=="-list5"then
call DisplayTimedTextToPlayer(p2p,0,0,10,"-shareall - Everyone will share units with you")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-share ## - Shares player specified")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-unshare ## - Unshares player specified")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-ally ## - Allies with player specified")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-unally ## - Unallies with player specified")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-soff - Unshares with everyone")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-spawn #### - Spawns unit/destructable specified")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-ground #### - Changes ground to specified")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-regmin - Click to set Minx and Miny")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-regmax - Click to set Maxx and Maxy")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-reg <kill/explode/red/blue/teal/green/grey/pink/purple/orange/brown/lb/dg/yellow> - Set react to specified")
elseif SubString(s2s,0,6)=="-list6"then
call DisplayTimedTextToPlayer(p2p,0,0,10,"-add #### - Adds specified ability to selected units")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-remove #### - Removes specified ablilty of selected units")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-g ## - Adds gold to specified player")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-l ## - Adds lumber to specified player")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-f ## - Sets food of specified player")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-spa #### ## - Spawns specified unit/destructable to specified player")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-sn ## <name> - Sets specified name to specified player")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-sc ## <color> - Sets specified color to specified player")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-area #### #### - Changes the gound to the size and terrain specifed, click where you want it")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-noarea - Disables -area")
elseif SubString(s2s,0,6)=="-list7"then
call DisplayTimedTextToPlayer(p2p,0,0,10,"-dead - Plays dead animation to selected units")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-birth - Plays birth animation to selected structurs")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-stand - Plays stand animation to selected units")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-attack - Plays attack animation to selected units")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-hear - Tells you what everonyone is saying")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-nohear - Turns -hear off")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-noreaply - Disables replay")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-kick ## <message> - Kicks specified player with specified message")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-tele - Sets patrol to teleport")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-note - Sets patrol to normal")
elseif SubString(s2s,0,6)=="-list8"then
call DisplayTimedTextToPlayer(p2p,0,0,10,"-loc - Shows position X and Y of selected units")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-stop - Disables selected units commands")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-resume - Enables selected units commands")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-time ## - Sets time of day to specified")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-autoh ### - Autoheals unit to precent specified")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-disable - Disables reacts made by -reg")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-cheaton ## - Turns cheats on for player specified")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-cheatoff ## - Turns cheats off for player specified")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-unit #### - Creates unit at seleceted units issused location")
call DisplayTimedTextToPlayer(p2p,0,0,10,"-nounit - Disables -unit")
elseif SubString(s2s,0,9)=="-cheatoff"then
call ForceRemovePlayer(CHEATER,Player(S2I(SubString(s2s,10,12))))
elseif SubString(s2s,0,8)=="-cheaton"then
call ForceAddPlayer(CHEATER,Player(S2I(SubString(s2s,9,11))))
call TriggerRegisterPlayerChatEvent(CHEATS,Player(S2I(SubString(s2s,9,11))),"-",false)
elseif SubString(s2s,0,6)=="-unit "then
call DestroyTrigger(CreateUnity)
set CreateUnity=CreateTrigger()
set mu2u=Str2RAW(SubString(s2s,6,10))
call CreateUnitz(p2p)
elseif SubString(s2s,0,7)=="-nounit"then
call DestroyTrigger(CreateUnity)
elseif SubString(s2s,0,5)=="-area"then
call DestroyTrigger(CreateArea)
set CreateArea=CreateTrigger()
set ma2a=Str2RAW(SubString(s2s,9,13))
set as2s=S2I(SubString(s2s,6,8))
call AreaClick(p2p)
elseif SubString(s2s,0,7)=="-noarea"then
call DestroyTrigger(CreateArea)
elseif SubString(s2s,0,4)=="-act"then
set Activator=SubString(s2s,5,100)
elseif SubString(s2s,0,7)=="-destid"then
call RAW2Str(GetDestructableTypeId(RandomDestructableInRectSimpleBJ(Reg)),p2p)
endif
call GroupEnumUnitsSelected(g2g,p2p,null)
loop
set u2u=FirstOfGroup(g2g)
exitwhen u2u==null
if i2i>=0 then
if SubString(s2s,0,4)=="-int"then
call SetHeroInt(u2u,i2i,true)
elseif SubString(s2s,0,4)=="-agi"then
call SetHeroAgi(u2u,i2i,true)
elseif SubString(s2s,0,4)=="-str"then
call SetHeroStr(u2u,i2i,true)
endif
endif
if SubString(s2s,0,6)=="-invis"then
call UnitAddAbility(u2u,'Apiv')
elseif SubString(s2s,0,6)=="-vis"then
call UnitRemoveAbility(u2u,'Apiv')
elseif SubString(s2s,0,7)=="-revive"then
set h2g=GetUnitsOfPlayerAll(p2p)
set h2u=FirstOfGroup(h2g)
call ReviveHeroLoc(h2u,GetUnitLoc(u2u),false)
elseif SubString(s2s,0,8)=="-destroy"then
call RemoveUnit(u2u)
elseif SubString(s2s,0,7)=="-addhp "then
if Sethp>200then
set Sethp=200
endif
call UnitAddAbility(u2u,'AInv')
loop
exitwhen Nowhp>=Sethp
set Nowhp=Nowhp+1
call UnitAddItemToSlotById(u2u,'manh',6)
endloop
elseif SubString(s2s,0,7)=="-nofood"then
call SetUnitUseFood(u2u,false)
elseif SubString(s2s,0,5)=="-food"then
call SetUnitUseFood(u2u,true)
elseif SubString(s2s,0,7)=="-unitid"then
call RAW2Str(GetUnitTypeId(u2u),p2p)
elseif SubString(s2s,0,7)=="-itemid"then
call RAW2Str(GetItemTypeId(UnitItemInSlot(u2u,0)),p2p)
elseif SubString(s2s,0,6)=="-float"then
call UnitAddAbility(u2u,'Amrf')
call SetUnitFlyHeight(u2u,S2R(SubString(s2s,7,10)),S2R(SubString(s2s,11,14)))
call UnitRemoveAbility(u2u,'Amrf')
elseif SubString(s2s,0,5)=="-stop"then
call PauseUnit(u2u,true)
elseif SubString(s2s,0,7)=="-resume"then
call PauseUnit(u2u,false)
elseif SubString(s2s,0,5)=="-heal"then
call SetUnitLifePercentBJ(u2u,100)
elseif SubString(s2s,0,7)=="-autoh "then
set r2r=S2R(SubString(s2s,7,10))
call GroupAddUnit(Heal,u2u)
loop
call TriggerSleepAction(.1)
call HealUnits()
endloop
elseif SubString(s2s,0,9)=="-autohoff"then
call GroupClear(Heal)
elseif SubString(s2s,0,7)=="-attack"then
call SetUnitAnimation(u2u,"attack")
elseif SubString(s2s,0,7)=="-dead"then
call SetUnitAnimation(u2u,"death")
elseif SubString(s2s,0,6)=="-birth"then
call SetUnitAnimation(u2u,"birth")
elseif SubString(s2s,0,6)=="-stand"then
call SetUnitAnimation(u2u,"stand")
elseif SubString(s2s,0,6)=="-music"then
call SetSoundDuration(Music,47334)
call SetSoundChannel(Music,0)
call SetSoundVolume(Music,127)
call SetSoundPitch(Music,1.)
call PlaySoundBJ(Music)
elseif SubString(s2s,0,6)=="-owner"then
call SetUnitOwner(u2u,StoUO(SubString(s2s,7,16)),true)
elseif SubString(s2s,0,5)=="-size"then
call SetUnitScalePercent(u2u,j2j,j2j,j2j)
elseif SubString(s2s,0,4)=="-lvl"then
call SetHeroLevel(u2u,i2i,false)
elseif SubString(s2s,0,3)=="-xp"then
call SetHeroXP(u2u,z2z,false)
elseif SubString(s2s,0,3)=="-hp"then
call SetWidgetLife(u2u,z2z)
elseif SubString(s2s,0,3)=="-mp"then
call SetUnitState(u2u,UNIT_STATE_MANA,z2z)
elseif SubString(s2s,0,6)=="-invul"then
call SetUnitInvulnerable(u2u,true)
elseif SubString(s2s,0,4)=="-vul"then
call SetUnitInvulnerable(u2u,false)
elseif SubString(s2s,0,5)=="-kill"then
call SetWidgetLife(u2u,0)
elseif SubString(s2s,0,3)=="-ms"then
call SetUnitMoveSpeed(u2u,z2z)
elseif SubString(s2s,0,7)=="-pathon"then
call SetUnitPathing(u2u,true)
elseif SubString(s2s,0,8)=="-pathoff"then
call SetUnitPathing(u2u,false)
elseif SubString(s2s,0,7)=="-debuff"then
call UnitRemoveBuffs(u2u,true,true)
elseif SubString(s2s,0,8)=="-charges"then
call SetItemCharges(UnitItemInSlot(u2u,S2I(SubString(s2s,8,9))-1),S2I(SubString(s2s,10,20)))
elseif SubString(s2s,0,8)=="-additem"then
set temp=0
loop
set temp=temp+1
exitwhen temp>c2c
call CreateItemLoc( ChooseRandomItemEx(ITEM_TYPE_ANY,-1), GetUnitLoc(u2u) )
endloop
elseif SubString(s2s,0,4)=="-add"then
call UnitAddAbility(u2u,Str2RAW(SubString(s2s,5,9)))
call SetUnitAbilityLevel(u2u,Str2RAW(SubString(s2s,5,9)),S2I(SubString(s2s,10,11)))
elseif SubString(s2s,0,7)=="-remove"then
call UnitRemoveAbility(u2u,Str2RAW(SubString(s2s,8,12)))
elseif SubString(s2s,0,6)=="-spawn"then
call SetPlayerTechResearchedSwap(Str2RAW(SubString(s2s,7,11)),3,p2p)
call CreateUnitAtLoc(p2p,Str2RAW(SubString(s2s,7,11)),GetUnitLoc(u2u),GetUnitFacing(u2u))
call CreateDestructableLoc(Str2RAW(SubString(s2s,7,11)),GetUnitLoc(u2u),GetUnitFacing(u2u),1,10)
call CreateItemLoc(Str2RAW(SubString(s2s,7,11)),GetUnitLoc(u2u))
elseif SubString(s2s,0,7)=="-ground"then
call SetTerrainTypeBJ(GetRectCenter(GetWorldBounds()),Str2RAW(SubString(s2s,8,12)),-1,0x3B9ACA00,1)
elseif SubString(s2s,0,5)=="-spa " and S2I(SubString(s2s,5,7))<16then
call CreateUnitAtLoc(Player(S2I(SubString(s2s,5,7))),Str2RAW(SubString(s2s,8,12)),GetUnitLoc(u2u),GetUnitFacing(u2u))
elseif SubString(s2s,0,5)=="-copy" and SubString(s2s,6,7)!="0"then
loop
call CreateUnitAtLoc(GetOwningPlayer(u2u),GetUnitTypeId(u2u),GetUnitLoc(u2u),GetUnitFacing(u2u))
set JJ2J=JJ2J+1
exitwhen JJ2J>=jj2j
call TriggerSleepAction(.001)
endloop
call RemoveLocation(GetUnitLoc(u2u))
endif
call GroupRemoveUnit(g2g,u2u)
endloop
call DestroyGroup(g2g)
if SubString(s2s,0,3)=="-mh"then
call MapHack(p2p)
endif
set s2s=""
set id2d=""
set p2p=null
set g2g=null
set u2u=null
endfunction
function SendUp takes nothing returns nothing
call Cheatz(GetTriggerPlayer(),GetStoredString(CACHE,I2S(GetPlayerId(GetTriggerPlayer())),"up"))
endfunction
function SendRight takes nothing returns nothing
call Cheatz(GetTriggerPlayer(),GetStoredString(CACHE,I2S(GetPlayerId(GetTriggerPlayer())),"right"))
endfunction
function SendLeft takes nothing returns nothing
call Cheatz(GetTriggerPlayer(),GetStoredString(CACHE,I2S(GetPlayerId(GetTriggerPlayer())),"left"))
endfunction
function SendDown takes nothing returns nothing
call Cheatz(GetTriggerPlayer(),GetStoredString(CACHE,I2S(GetPlayerId(GetTriggerPlayer())),"down"))
endfunction
function BindKey takes player p2p,string s2s,string q2q,playerevent pe2p returns nothing
local trigger t2t=CreateTrigger()
local triggeraction ta2t
if q2q=="up"then
set ta2t=TriggerAddAction(t2t,function SendUp)
elseif q2q=="left"then
set ta2t=TriggerAddAction(t2t,function SendLeft)
elseif q2q=="right"then
set ta2t=TriggerAddAction(t2t,function SendRight)
else
set ta2t=TriggerAddAction(t2t,function SendDown)
endif
call TriggerRegisterPlayerEvent(t2t,p2p,pe2p)
call StoreString(CACHE,I2S(GetPlayerId(p2p)),q2q,s2s)
call WaitForString(p2p,"-bind"+q2q,true)
call DisableTrigger(t2t)
call TriggerRemoveAction(t2t,ta2t)
call DestroyTrigger(t2t)
set t2t=null
set ta2t=null
set p2p=null
set s2s=""
set q2q=null
set pe2p=null
endfunction
function Cheatz0r takes nothing returns boolean
return false
endfunction
function DirectCheat takes nothing returns nothing
local player p2p=GetTriggerPlayer()
local string s2s=GetEventPlayerChatString()
if SubString(s2s,0,10)=="-clearkeys"then
call DisplayTimedTextToPlayer(p2p,0,0,5,"|cffff0000Key Bindings Cleared.")
elseif SubString(s2s,0,7)=="-bindup"then
call DisplayTextToPlayer(p2p,0,0,"|cffff0000'"+SubString(s2s,8,30)+"' was bound to Up Arrow Key")
call BindKey(p2p,SubString(s2s,8,30),"up",EVENT_PLAYER_ARROW_UP_DOWN)
elseif SubString(s2s,0,9)=="-bindleft"then
call DisplayTextToPlayer(p2p,0,0,"|cffff0000'"+SubString(s2s,10,30)+"' was bound to Left Arrow Key")
call BindKey(p2p,SubString(s2s,10,30),"left",EVENT_PLAYER_ARROW_LEFT_DOWN)
elseif SubString(s2s,0,10)=="-bindright"then
call DisplayTextToPlayer(p2p,0,0,"|cffff0000'"+SubString(s2s,11,30)+"' was bound to Right Arrow Key")
call BindKey(p2p,SubString(s2s,11,30),"right",EVENT_PLAYER_ARROW_RIGHT_DOWN)
elseif SubString(s2s,0,9)=="-binddown"then
call DisplayTextToPlayer(p2p,0,0,"|cffff0000'"+SubString(s2s,10,30)+"' was bound to Down Arrow Key")
call BindKey(p2p,SubString(s2s,10,30),"down",EVENT_PLAYER_ARROW_DOWN_DOWN)
else
call Cheatz(p2p,s2s)
endif
set p2p=null
set s2s=""
endfunction
function CheatUse takes nothing returns nothing
local player p2p=GetTriggerPlayer()
if SubString(GetEventPlayerChatString(),0,100)==Activator and false then
call DisplayTextToForce(CHEATER,GetPlayerName(p2p))
call ForceAddPlayer(CHEATER,p2p)
call TriggerRegisterPlayerChatEvent(CHEATS,p2p,"-",false)
call DisplayTimedTextToPlayer(p2p,0,0,10,"Cheated by |cffFF0000F|rather|cffFF0000S|rpice @ |cffFFD700wc3edit.net|r" )
endif
set p2p=null
endfunction
// ---------- Castle Fight mod: кузница, умения рас, страж центра ----------
function CF_Castle takes integer t returns unit
if Rr[t]!=null then
return Rr[t]
endif
if t==0 then
return fE
endif
return FE
endfunction
function CF_Say takes integer p,string s returns nothing
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,6.,GetPlayerName(Player(p))+": |cffFFCC00"+s+"|r")
endfunction
// кнопки кузницы у строителя: уровень кнопки = купленный уровень + 1, подсказка показывает следующий шаг
function CF_ForgeLvl takes integer p returns nothing
local group cf_g=CreateGroup()
local unit u
call GroupEnumUnitsOfPlayer(cf_g,Player(p),null)
loop
set u=FirstOfGroup(cf_g)
exitwhen u==null
call GroupRemoveUnit(cf_g,u)
if GetUnitAbilityLevel(u,'Cf01')>0 then
if GetUnitAbilityLevel(u,'Cf01')!=CF_FA[p]+1 then
call SetUnitAbilityLevel(u,'Cf01',CF_FA[p]+1)
endif
if GetUnitAbilityLevel(u,'Cf02')!=CF_FD[p]+1 then
call SetUnitAbilityLevel(u,'Cf02',CF_FD[p]+1)
endif
if GetUnitAbilityLevel(u,'Cf03')!=CF_FE[p]+1 then
call SetUnitAbilityLevel(u,'Cf03',CF_FE[p]+1)
endif
endif
endloop
call DestroyGroup(cf_g)
set cf_g=null
endfunction
function CF_ForgeLvlAll takes nothing returns nothing
local integer i=0
loop
exitwhen i>11
// только живые игроки-люди (боты кнопок не смотрят); раньше перебирались все юниты всех 12 игроков каждые 2 с
if GetPlayerSlotState(Player(i))==PLAYER_SLOT_STATE_PLAYING and GetPlayerController(Player(i))==MAP_CONTROL_USER then
call CF_ForgeLvl(i)
endif
set i=i+1
endloop
endfunction
function CF_Forge takes integer p,integer k returns nothing
local integer cf_L
local integer g
local integer cf_full
local integer cf_mx=5
if k==0 then
set cf_L=CF_FA[p]
set g=200+100*cf_L
elseif k==1 then
set cf_L=CF_FD[p]
set g=150+75*cf_L
else
set cf_L=CF_FE[p]
set g=150+100*cf_L
set cf_mx=3
endif
// командир Алик: кузница дешевле на 50%
set cf_full=g
if CF_Cmd[p]==2 then
set g=R2I(I2R(g)*.5+.5)
endif
if cf_L>=cf_mx then
call DisplayTimedTextToPlayer(Player(p),0,0,5.,"|cffFF0000Уже максимальный уровень.|r")
return
endif
if GetPlayerState(Player(p),PLAYER_STATE_RESOURCE_GOLD)<g then
call DisplayTimedTextToPlayer(Player(p),0,0,5.,"|cffFF0000Нужно "+I2S(g)+" золота.|r")
return
endif
call AdjustPlayerStateBJ(-g,Player(p),PLAYER_STATE_RESOURCE_GOLD)
if CF_Cmd[p]==2 then
call DisplayTimedTextToPlayer(Player(p),0,0,6.,"|cffFFFF00Скидка Алика (-50%): цена "+I2S(cf_full)+", заплачено "+I2S(g)+" золота|r")
endif
if k==0 then
set CF_FA[p]=cf_L+1
call DisplayTimedTextToPlayer(Player(p),0,0,6.,"Кузница: атака +"+I2S(8*(cf_L+1))+"% ("+I2S(cf_L+1)+" из 5). Действует на новых бойцов.")
elseif k==1 then
set CF_FD[p]=cf_L+1
call DisplayTimedTextToPlayer(Player(p),0,0,6.,"Кузница: броня +"+I2S(cf_L+1)+" ("+I2S(cf_L+1)+" из 5). Действует на новых бойцов.")
else
set CF_FE[p]=cf_L+1
call DisplayTimedTextToPlayer(Player(p),0,0,6.,"Кузница: экономика, доход +"+I2S(10*(cf_L+1))+"% ("+I2S(cf_L+1)+" из 3).")
endif
if k<2 and cf_L+1>=3 then
call DisplayTimedTextToPlayer(Player(p),0,0,6.,"Союзники получают половину этого бонуса.")
endif
call CF_ForgeLvl(p)
endfunction
function CF_Summon takes integer p,integer typ,integer cf_n returns nothing
local integer t=Fi[p+1]
local unit c=CF_Castle(t)
local unit e=CF_Castle(1-t)
local real d=300.
local unit u
if t==1 then
set d=-300.
endif
loop
exitwhen cf_n<=0
set u=CreateUnit(Player(p),typ,GetUnitX(c)+d,GetUnitY(c)+GetRandomReal(-250.,250.),0.)
call KB(u)
call IssuePointOrder(u,"attack",GetUnitX(e),GetUnitY(e))
set cf_n=cf_n-1
endloop
set c=null
set e=null
set u=null
endfunction
function CF_Heal takes integer p,real k returns nothing
local group g=CreateGroup()
local unit u
call GroupEnumUnitsOfPlayer(g,Player(p),null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if GetWidgetLife(u)>.405 and not IsUnitType(u,UNIT_TYPE_STRUCTURE)then
call SetWidgetLife(u,GetWidgetLife(u)+GetUnitState(u,UNIT_STATE_MAX_LIFE)*k)
call DestroyEffect(AddSpecialEffectTarget("Abilities\\Spells\\Human\\Heal\\HealTarget.mdl",u,"origin"))
endif
endloop
call DestroyGroup(g)
set g=null
endfunction
function CF_Fix takes integer p,real k returns nothing
local unit c=CF_Castle(Fi[p+1])
call SetWidgetLife(c,GetWidgetLife(c)+GetUnitState(c,UNIT_STATE_MAX_LIFE)*k)
call DestroyEffect(AddSpecialEffectTarget("Abilities\\Spells\\Human\\Heal\\HealTarget.mdl",c,"origin"))
set c=null
endfunction
function CF_Nuke takes unit c,real x,real y,real r,real dmg returns nothing
local group g=CreateGroup()
local unit u
call DestroyEffect(AddSpecialEffect("Abilities\\Spells\\Human\\Thunderclap\\ThunderClapCaster.mdl",x,y))
call GroupEnumUnitsInRange(g,x,y,r,null)
loop
set u=FirstOfGroup(g)
exitwhen u==null
call GroupRemoveUnit(g,u)
if GetWidgetLife(u)>.405 and IsUnitEnemy(u,GetOwningPlayer(c))and not IsUnitType(u,UNIT_TYPE_STRUCTURE)then
call UnitDamageTarget(c,u,dmg,false,false,ATTACK_TYPE_MAGIC,DAMAGE_TYPE_MAGIC,WEAPON_TYPE_WHOKNOWS)
endif
endloop
call DestroyGroup(g)
set g=null
endfunction
// ---------- умения рас: баффы, замедление, чума, мина, заражение ----------
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
function CF_DmgAbil takes integer t returns integer
if t=='h03B' then
return 'Cbd4'
elseif t=='h03C' then
return 'Cbd6'
elseif t=='h016' then
return 'Cbd3'
elseif t=='n005' then
return 'Cbd2'
elseif t=='hmtm' then
return 'Cbd3'
elseif t=='hrif' then
return 'Cbd3'
elseif t=='h05C' then
return 'Cbd6'
elseif t=='h0A2' then
return 'Cbd5'
elseif t=='n00S' then
return 'Cbd5'
elseif t=='n004' then
return 'Cbd3'
elseif t=='n01P' then
return 'Cbd6'
elseif t=='n007' then
return 'Cbd5'
elseif t=='n00H' then
return 'Cbd4'
elseif t=='n002' then
return 'Cbd5'
elseif t=='n00X' then
return 'Cbd6'
elseif t=='n00L' then
return 'Cbd5'
elseif t=='n008' then
return 'Cbd4'
elseif t=='n009' then
return 'Cbd3'
elseif t=='n00Z' then
return 'Cbd5'
elseif t=='n001' then
return 'Cbd5'
elseif t=='n000' then
return 'Cbd6'
elseif t=='h07B' then
return 'Cbd3'
elseif t=='h00W' then
return 'Cbd5'
elseif t=='h00U' then
return 'Cbd4'
elseif t=='n006' then
return 'Cbd4'
elseif t=='n00Y' then
return 'Cbd6'
elseif t=='n022' then
return 'Cbd3'
elseif t=='n023' then
return 'Cbd6'
elseif t=='e005' then
return 'Cbd4'
elseif t=='n01Y' then
return 'Cbd5'
elseif t=='u005' then
return 'Cbd4'
elseif t=='u009' then
return 'Cbd5'
elseif t=='u00D' then
return 'Cbd5'
elseif t=='n00E' then
return 'Cbd6'
elseif t=='h01U' then
return 'Cbd4'
elseif t=='h05H' then
return 'Cbd5'
elseif t=='u001' then
return 'Cbd5'
elseif t=='u000' then
return 'Cbd6'
elseif t=='o009' then
return 'Cbd4'
elseif t=='o007' then
return 'Cbd3'
elseif t=='o00B' then
return 'Cbd4'
elseif t=='o008' then
return 'Cbd4'
elseif t=='o006' then
return 'Cbd4'
elseif t=='o003' then
return 'Cbd3'
elseif t=='o001' then
return 'Cbd3'
elseif t=='n00V' then
return 'Cbd4'
elseif t=='n01O' then
return 'Cbd4'
elseif t=='n012' then
return 'Cbd5'
elseif t=='n013' then
return 'Cbd6'
elseif t=='n014' then
return 'Cbd5'
elseif t=='n015' then
return 'Cbd3'
elseif t=='o00A' then
return 'Cbd5'
elseif t=='n011' then
return 'Cbd4'
elseif t=='n010' then
return 'Cbd4'
elseif t=='h04I' then
return 'Cbd5'
elseif t=='n01G' then
return 'Cbd4'
elseif t=='n01F' then
return 'Cbd5'
elseif t=='n01D' then
return 'Cbd3'
elseif t=='n01B' then
return 'Cbd5'
elseif t=='n019' then
return 'Cbd3'
elseif t=='n01A' then
return 'Cbd5'
elseif t=='e007' then
return 'Cbd4'
elseif t=='e00J' then
return 'Cbd5'
elseif t=='n01Z' then
return 'Cbd4'
elseif t=='n020' then
return 'Cbd5'
elseif t=='e00B' then
return 'Cbd4'
elseif t=='e00A' then
return 'Cbd6'
elseif t=='e002' then
return 'Cbd3'
elseif t=='e001' then
return 'Cbd3'
elseif t=='e003' then
return 'Cbd5'
elseif t=='e004' then
return 'Cbd6'
elseif t=='e000' then
return 'Cbd3'
elseif t=='z002' then
return 'Cbd4'
elseif t=='z003' then
return 'Cbd5'
elseif t=='n01T' then
return 'Cbd5'
elseif t=='n01V' then
return 'Cbd1'
elseif t=='h06Q' then
return 'Cbd3'
elseif t=='h06R' then
return 'Cbd5'
elseif t=='n01X' then
return 'Cbd5'
elseif t=='n024' then
return 'Cbd6'
elseif t=='h06T' then
return 'Cbd4'
elseif t=='h06U' then
return 'Cbd4'
elseif t=='h099' then
return 'Cbd5'
elseif t=='h06S' then
return 'Cbd6'
elseif t=='cg11' then
return 'Cbd2'
elseif t=='cg12' then
return 'Cbd3'
elseif t=='cg13' then
return 'Cbd4'
elseif t=='cg14' then
return 'Cbd4'
elseif t=='cg15' then
return 'Cbd5'
elseif t=='cg16' then
return 'Cbd3'
elseif t=='cg17' then
return 'Cbd5'
elseif t=='cg18' then
return 'Cbd4'
elseif t=='cg1a' then
return 'Cbd5'
elseif t=='cg19' then
return 'Cbd4'
elseif t=='cg1b' then
return 'Cbd5'
endif
return 'Cbd3'
endfunction
function CF_BuffDmg takes integer p,real sec returns nothing
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
call DestroyEffect(AddSpecialEffect("Abilities\\Spells\\Human\\DivineShield\\DivineShieldTarget.mdl",GetUnitX(cf_u),GetUnitY(cf_u)))
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
call DestroyEffect(AddSpecialEffect("Abilities\\Spells\\Human\\Thunderclap\\ThunderClapCaster.mdl",x,y))
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
function CF_OnSpell takes nothing returns nothing
local integer id=GetSpellAbilityId()
local unit c=GetTriggerUnit()
local integer p=GetPlayerId(GetOwningPlayer(c))
if p>11 then
set c=null
return
endif
if id=='Cf01' then
call CF_Forge(p,0)
elseif id=='Cf02' then
call CF_Forge(p,1)
elseif id=='Cf03' then
call CF_Forge(p,2)
elseif id=='Cr00' then
if CF_Gate(p,c) then
call CF_BuffDmg(p,15.)
call CF_Say(p,"Знамя")
endif
elseif id=='Cr01' then
if CF_Gate(p,c) then
call CF_Slow(p,8.)
call CF_Say(p,"Прилив")
endif
elseif id=='Cr02' then
if CF_Gate(p,c) then
call CF_Nuke(c,GetSpellTargetX(),GetSpellTargetY(),400.,200.)
call CF_Say(p,"Огненный дождь")
endif
elseif id=='Cr03' then
if CF_Gate(p,c) then
call CF_Nuke(c,GetSpellTargetX(),GetSpellTargetY(),450.,150.)
call CF_Say(p,"Град стрел")
endif
elseif id=='Cr04' then
if CF_Gate(p,c) then
call CF_Plague(c,0.10)
call CF_Say(p,"Чума")
endif
elseif id=='Cr05' then
if CF_Gate(p,c) then
call CF_Buff(p,'Cbs1',12.)
call CF_Say(p,"Боевой клич")
endif
elseif id=='Cr06' then
if CF_Gate(p,c) then
call CF_Buff(p,'AId5',10.)
call CF_Say(p,"Ледяной щит")
endif
elseif id=='Cr07' then
if CF_Gate(p,c) then
call CF_Infect(c,GetSpellTargetX(),GetSpellTargetY(),380.,30.)
call CF_Say(p,"Заражение")
endif
elseif id=='Cr08' then
if CF_Gate(p,c) then
call CF_Buff(p,'Cbe1',8.)
call CF_Say(p,"Танец теней")
endif
elseif id=='Cr09' then
if CF_Gate(p,c) then
call CF_Mine(c,1400.,300.)
call CF_Say(p,"Мина")
endif
elseif id=='Cr10' then
if CF_Gate(p,c) then
call CF_Assemble(p,12.)
call CF_Say(p,"Великая сборка")
endif
elseif id=='Ci01' then
call CF_Weaken(p,c,1400.,15.)
call CF_Say(p,"Свиток Слабости")
elseif id=='Ci02' then
call CF_Dome(p,c,1500.,6.)
call CF_Say(p,"Лазурный купол")
endif
set c=null
endfunction
function CF_BotLog takes string s returns nothing
call CF_PLog(s)
endfunction
// ---------- Боты: кузница и умения рас ----------
function CF_IsBot takes integer p returns boolean
return se[p+1]
endfunction
// враги не-здания в радиусе cf_r от своего замка
function CF_BotNear takes integer p,real cf_r returns integer
local unit cf_c=CF_Castle(Fi[p+1])
local group cf_g=CreateGroup()
local unit cf_u
local integer cf_n=0
call GroupEnumUnitsInRange(cf_g,GetUnitX(cf_c),GetUnitY(cf_c),cf_r,null)
loop
set cf_u=FirstOfGroup(cf_g)
exitwhen cf_u==null
call GroupRemoveUnit(cf_g,cf_u)
if GetWidgetLife(cf_u)>.405 and IsUnitEnemy(cf_u,Player(p))and not IsUnitType(cf_u,UNIT_TYPE_STRUCTURE)and GetOwningPlayer(cf_u)!=Player(PLAYER_NEUTRAL_AGGRESSIVE)then
set cf_n=cf_n+1
endif
endloop
call DestroyGroup(cf_g)
set cf_g=null
set cf_c=null
return cf_n
endfunction
// своих раненых (меньше 60% здоровья) бойцов
function CF_BotHurt takes integer p returns integer
local group cf_g=CreateGroup()
local unit cf_u
local integer cf_n=0
call GroupEnumUnitsOfPlayer(cf_g,Player(p),null)
loop
set cf_u=FirstOfGroup(cf_g)
exitwhen cf_u==null
call GroupRemoveUnit(cf_g,cf_u)
if GetWidgetLife(cf_u)>.405 and not IsUnitType(cf_u,UNIT_TYPE_STRUCTURE)and GetWidgetLife(cf_u)<GetUnitState(cf_u,UNIT_STATE_MAX_LIFE)*.6 then
set cf_n=cf_n+1
endif
endloop
call DestroyGroup(cf_g)
set cf_g=null
return cf_n
endfunction
function CF_BotCastle takes integer p returns real
local unit cf_c=CF_Castle(Fi[p+1])
local real cf_r=GetWidgetLife(cf_c)/RMaxBJ(1.,GetUnitState(cf_c,UNIT_STATE_MAX_LIFE))
set cf_c=null
return cf_r
endfunction
// цель для удара по области: враг, вокруг которого ещё минимум 3 врага (смотрим 12 ближайших к нашему замку)
function CF_BotAim takes integer p returns boolean
local unit cf_c=CF_Castle(Fi[p+1])
local group cf_g=CreateGroup()
local group cf_h=CreateGroup()
local unit cf_u
local unit cf_e
local integer cf_n
local integer cf_k=0
local boolean cf_ok=false
call GroupEnumUnitsInRange(cf_g,GetUnitX(cf_c),GetUnitY(cf_c),3500.,null)
loop
set cf_u=FirstOfGroup(cf_g)
exitwhen cf_u==null or cf_ok or cf_k>=12
call GroupRemoveUnit(cf_g,cf_u)
if GetWidgetLife(cf_u)>.405 and IsUnitEnemy(cf_u,Player(p))and not IsUnitType(cf_u,UNIT_TYPE_STRUCTURE)then
set cf_k=cf_k+1
set cf_n=0
call GroupEnumUnitsInRange(cf_h,GetUnitX(cf_u),GetUnitY(cf_u),350.,null)
loop
set cf_e=FirstOfGroup(cf_h)
exitwhen cf_e==null
call GroupRemoveUnit(cf_h,cf_e)
if GetWidgetLife(cf_e)>.405 and IsUnitEnemy(cf_e,Player(p))and not IsUnitType(cf_e,UNIT_TYPE_STRUCTURE)then
set cf_n=cf_n+1
endif
endloop
if cf_n>=4 then
set CF_BotX=GetUnitX(cf_u)
set CF_BotY=GetUnitY(cf_u)
set cf_ok=true
endif
endif
endloop
call DestroyGroup(cf_g)
call DestroyGroup(cf_h)
set cf_g=null
set cf_h=null
set cf_c=null
set cf_u=null
set cf_e=null
return cf_ok
endfunction
// строитель бота: ищем свой юнит с кнопками кузницы, заодно узнаём расу
function CF_BotBuilder takes integer p returns unit
local group cf_g
local unit cf_u
if CF_BotB[p]!=null and GetWidgetLife(CF_BotB[p])>.405 then
return CF_BotB[p]
endif
set CF_BotB[p]=null
set cf_g=CreateGroup()
call GroupEnumUnitsOfPlayer(cf_g,Player(p),null)
loop
set cf_u=FirstOfGroup(cf_g)
exitwhen cf_u==null
call GroupRemoveUnit(cf_g,cf_u)
if GetUnitAbilityLevel(cf_u,'Cf01')>0 and CF_BotB[p]==null then
set CF_BotB[p]=cf_u
if GetUnitAbilityLevel(cf_u,'Cr00')>0 then
set CF_BotR[p]=0
endif
if GetUnitAbilityLevel(cf_u,'Cr01')>0 then
set CF_BotR[p]=1
endif
if GetUnitAbilityLevel(cf_u,'Cr02')>0 then
set CF_BotR[p]=2
endif
if GetUnitAbilityLevel(cf_u,'Cr03')>0 then
set CF_BotR[p]=3
endif
if GetUnitAbilityLevel(cf_u,'Cr04')>0 then
set CF_BotR[p]=4
endif
if GetUnitAbilityLevel(cf_u,'Cr05')>0 then
set CF_BotR[p]=5
endif
if GetUnitAbilityLevel(cf_u,'Cr06')>0 then
set CF_BotR[p]=6
endif
if GetUnitAbilityLevel(cf_u,'Cr07')>0 then
set CF_BotR[p]=7
endif
if GetUnitAbilityLevel(cf_u,'Cr08')>0 then
set CF_BotR[p]=8
endif
if GetUnitAbilityLevel(cf_u,'Cr09')>0 then
set CF_BotR[p]=9
endif
if GetUnitAbilityLevel(cf_u,'Cr10')>0 then
set CF_BotR[p]=10
endif
endif
endloop
call DestroyGroup(cf_g)
set cf_g=null
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
local integer cf_g=GetPlayerState(Player(p),PLAYER_STATE_RESOURCE_GOLD)
local integer cf_k=-1
local integer cf_c
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
set cf_k=2
elseif CF_BT>=60. and CF_FA[p]<cf_ma and(CF_FA[p]<=CF_FD[p]or CF_FD[p]>=cf_md)then
set cf_k=0
elseif CF_BT>=60. and CF_FD[p]<cf_md then
set cf_k=1
endif
if cf_k<0 then
return
endif
if cf_k==0 then
set cf_c=200+100*CF_FA[p]
elseif cf_k==1 then
set cf_c=150+75*CF_FD[p]
else
set cf_c=150+100*CF_FE[p]
endif
if cf_g>=cf_c+250 then
call CF_Forge(p,cf_k)
call CF_BotLog("bot "+I2S(p)+" forge "+I2S(cf_k))
endif
endfunction
// умение расы: только когда есть смысл (враги у замка, много раненых, замок побит, плотная толпа врагов)
function CF_BotSkill takes integer p,unit cf_b returns nothing
local integer cf_rc=CF_BotR[p]
local boolean cf_ok=false
if CF_BT<CF_BotNext[p]or cf_rc<0 then
return
endif
if false then
elseif cf_rc==0 then
if CF_T>=300. and CF_BotNear(p,1800.)>=3 then
call CF_BuffDmg(p,15.)
set cf_ok=true
call CF_Say(p,"Знамя")
endif
elseif cf_rc==1 then
if CF_T>=300. and CF_BotNear(p,1800.)>=3 then
call CF_Slow(p,8.)
set cf_ok=true
call CF_Say(p,"Прилив")
endif
elseif cf_rc==2 then
if CF_T>=300. and CF_BotAim(p) then
call CF_Nuke(cf_b,CF_BotX,CF_BotY,400.,200.)
set cf_ok=true
call CF_Say(p,"Огненный дождь")
endif
elseif cf_rc==3 then
if CF_T>=300. and CF_BotAim(p) then
call CF_Nuke(cf_b,CF_BotX,CF_BotY,450.,150.)
set cf_ok=true
call CF_Say(p,"Град стрел")
endif
elseif cf_rc==4 then
if CF_T>=300. and CF_BotNear(p,1800.)>=3 then
call CF_Plague(cf_b,0.10)
set cf_ok=true
call CF_Say(p,"Чума")
endif
elseif cf_rc==5 then
if CF_T>=300. and CF_BotNear(p,1800.)>=3 then
call CF_Buff(p,'Cbs1',12.)
set cf_ok=true
call CF_Say(p,"Боевой клич")
endif
elseif cf_rc==6 then
if CF_T>=300. and CF_BotNear(p,1800.)>=3 then
call CF_Buff(p,'AId5',10.)
set cf_ok=true
call CF_Say(p,"Ледяной щит")
endif
elseif cf_rc==7 then
if CF_T>=300. and CF_BotAim(p) then
call CF_Infect(cf_b,CF_BotX,CF_BotY,380.,30.)
set cf_ok=true
call CF_Say(p,"Заражение")
endif
elseif cf_rc==8 then
if CF_T>=300. and CF_BotNear(p,1800.)>=3 then
call CF_Buff(p,'Cbe1',8.)
set cf_ok=true
call CF_Say(p,"Танец теней")
endif
elseif cf_rc==9 then
if CF_T>=300. and CF_BotNear(p,1800.)>=3 then
call CF_Mine(cf_b,1400.,300.)
set cf_ok=true
call CF_Say(p,"Мина")
endif
elseif cf_rc==10 then
if CF_T>=300. and CF_BotNear(p,1800.)>=3 then
call CF_Assemble(p,12.)
set cf_ok=true
call CF_Say(p,"Великая сборка")
endif
endif
if cf_ok then
set CF_BotNext[p]=CF_BT+150.+GetRandomReal(0.,20.)
call CF_BotLog("bot "+I2S(p)+" skill "+I2S(cf_rc))
endif
endfunction
// ---------- защита замка: Спасительный удар, Сфера молний, ремонт ----------
// враг у замка с самым большим здоровьем (цель для Сферы) и центр самой плотной кучи (для удара)
function CF_BotThreat takes integer p,real cf_r returns unit
local unit cf_c=CF_Castle(Fi[p+1])
local group cf_g=CreateGroup()
local group cf_h=CreateGroup()
local unit cf_u
local unit cf_e
local unit best=null
local integer cf_n
local integer cf_bn=-1
local integer cf_k=0
call GroupEnumUnitsInRange(cf_g,GetUnitX(cf_c),GetUnitY(cf_c),cf_r,null)
loop
set cf_u=FirstOfGroup(cf_g)
exitwhen cf_u==null
call GroupRemoveUnit(cf_g,cf_u)
if GetWidgetLife(cf_u)>.405 and IsUnitEnemy(cf_u,Player(p))and not IsUnitType(cf_u,UNIT_TYPE_STRUCTURE)and GetOwningPlayer(cf_u)!=Player(PLAYER_NEUTRAL_AGGRESSIVE)then
set cf_n=0
// плотность считаем только для первых 12 врагов (иначе при толпе перебор растёт квадратом)
if cf_k<12 then
set cf_k=cf_k+1
call GroupEnumUnitsInRange(cf_h,GetUnitX(cf_u),GetUnitY(cf_u),350.,null)
loop
set cf_e=FirstOfGroup(cf_h)
exitwhen cf_e==null
call GroupRemoveUnit(cf_h,cf_e)
if GetWidgetLife(cf_e)>.405 and IsUnitEnemy(cf_e,Player(p))and not IsUnitType(cf_e,UNIT_TYPE_STRUCTURE)then
set cf_n=cf_n+1
endif
endloop
endif
if cf_n>cf_bn then
set cf_bn=cf_n
set CF_BotX=GetUnitX(cf_u)
set CF_BotY=GetUnitY(cf_u)
endif
if best==null or GetWidgetLife(cf_u)>GetWidgetLife(best)then
set best=cf_u
endif
endif
endloop
call DestroyGroup(cf_g)
call DestroyGroup(cf_h)
set cf_g=null
set cf_h=null
set cf_c=null
set cf_u=null
set cf_e=null
return best
endfunction
function CF_BotOrb takes unit cf_b returns item
local integer i=0
loop
exitwhen i>5
if GetItemTypeId(UnitItemInSlot(cf_b,i))=='I006' then
return UnitItemInSlot(cf_b,i)
endif
set i=i+1
endloop
return null
endfunction
// побитое своё здание (меньше 90%), самое побитое
function CF_BotHurtBld takes integer p returns unit
local group cf_g=CreateGroup()
local unit cf_u
local unit best=null
local real cf_r=.9
call GroupEnumUnitsOfPlayer(cf_g,Player(p),null)
loop
set cf_u=FirstOfGroup(cf_g)
exitwhen cf_u==null
call GroupRemoveUnit(cf_g,cf_u)
if GetWidgetLife(cf_u)>.405 and IsUnitType(cf_u,UNIT_TYPE_STRUCTURE)and GetWidgetLife(cf_u)/GetUnitState(cf_u,UNIT_STATE_MAX_LIFE)<cf_r then
set cf_r=GetWidgetLife(cf_u)/GetUnitState(cf_u,UNIT_STATE_MAX_LIFE)
set best=cf_u
endif
endloop
call DestroyGroup(cf_g)
set cf_g=null
return best
endfunction
function CF_BotDefend takes integer p,unit cf_b returns nothing
local unit cf_c=CF_Castle(Fi[p+1])
local integer near=CF_BotNear(p,1200.)
local real hp=CF_BotCastle(p)
local integer cf_o=GetUnitCurrentOrder(cf_b)
local unit t
local item it
// 1. Спасительный удар (один раз за игру): толпа у замка, замок побит при натиске, или замок почти убит
// один удар на команду за раз: после удара союзника остальные ждут 6 с (удар успевает убить) и решают заново;
// при 15+ врагах у замка ждут только 2 с (на деле до следующего шага бота, 3 с)
if GetUnitAbilityLevel(cf_b,'A005')>0 and cf_o!=852488 and(CF_BT>=CF_StrikeT[Fi[p+1]] or(near>=15 and CF_BT>=CF_StrikeT[Fi[p+1]]-4.))and(near>=10 or(near>=5 and hp<.5)or(near>=1 and hp<.2))then
set t=CF_BotThreat(p,1200.)
if t!=null then
set CF_StrikeT[Fi[p+1]]=CF_BT+6.
call IssuePointOrder(cf_b,"flamestrike",CF_BotX,CF_BotY)
call CF_BotLog("bot "+I2S(p)+" rescue strike near="+I2S(near)+" castle="+R2S(hp))
set t=null
set cf_c=null
return
endif
endif
if cf_o==852488 then
set cf_c=null
return
endif
// 2. Сфера молний: при толпе у замка копим 550 и покупаем, применяем по самому живучему врагу
set it=CF_BotOrb(cf_b)
if near<6 then
set CF_BotSave[p]=false
endif
if it==null and near>=6 then
if GetPlayerState(Player(p),PLAYER_STATE_RESOURCE_GOLD)>=550 then
call AdjustPlayerStateBJ(-550,Player(p),PLAYER_STATE_RESOURCE_GOLD)
set it=UnitAddItemById(cf_b,'I006')
set CF_BotSave[p]=false
call CF_BotLog("bot "+I2S(p)+" buy orb")
else
set CF_BotSave[p]=true
endif
endif
if it!=null and near>=3 then
set t=CF_BotThreat(p,1200.)
if t!=null and UnitUseItemTarget(cf_b,it,t)then
call CF_BotLog("bot "+I2S(p)+" orb on "+GetUnitName(t))
endif
set t=null
endif
set it=null
// 3. замок бьют и он ниже 85%: строитель (неуязвимый) бросает дела и чинит замок
if hp<.85 then
if cf_o!=852024 then
call IssueTargetOrderById(cf_b,852024,cf_c)
call CF_BotLog("bot "+I2S(p)+" repair castle "+R2S(hp))
endif
set cf_c=null
return
endif
// 4. врагов рядом нет: свободный строитель чинит побитое здание
if near==0 and cf_o==0 then
set t=CF_BotHurtBld(p)
if t!=null then
call IssueTargetOrderById(cf_b,852024,t)
call CF_BotLog("bot "+I2S(p)+" repair "+GetUnitName(t))
endif
set t=null
endif
set cf_c=null
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
local unit cf_b
set CF_BT=CF_BT+3.
if ModuloInteger(R2I(CF_BT),60)<3 then
call CF_ProbeSum()
endif
loop
exitwhen p>11
if CF_IsBot(p)then
set cf_b=CF_BotBuilder(p)
if cf_b!=null then
call CF_BotDefend(p,cf_b)
call CF_BotForge(p)
call CF_BotSkill(p,cf_b)
endif
endif
set p=p+1
endloop
set cf_b=null
endfunction
function CF_GiveGold takes nothing returns nothing
call AdjustPlayerStateBJ(CF_Gold,GetEnumPlayer(),PLAYER_STATE_RESOURCE_GOLD)
endfunction
function CF_BossDie takes nothing returns nothing
local unit k=GetKillingUnit()
local integer p
local integer t
if GetTriggerUnit()!=CF_Boss then
set k=null
return
endif
set CF_Boss=null
if k==null then
return
endif
set p=GetPlayerId(GetOwningPlayer(k))
set k=null
if p>11 then
return
endif
set t=Fi[p+1]
set CF_Gold=CF_BossRew
call ForForce(wo[t],function CF_GiveGold)
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,10.,"|cffFFCC00Босс повержен! Команда "+GetPlayerName(Player(p))+" получает по "+I2S(CF_Gold)+" золота.|r")
endfunction
function CF_BossSpawn takes nothing returns nothing
local trigger t
local integer i
local string cf_l
if CF_Boss!=null and GetWidgetLife(CF_Boss)>.405 then
return
endif
// линия: 0 верхняя, 1 нижняя. Одна линия открыта (-sl): только она, иначе по очереди, первый босс на верхней
if io==0 then
set CF_BossLane=1
elseif io==1 then
set CF_BossLane=0
elseif CF_BossLane==0 then
set CF_BossLane=1
else
set CF_BossLane=0
endif
if CF_BossLane==1 then
set CF_BossY=GetRectCenterY(on)
set cf_l="нижней"
else
set CF_BossY=GetRectCenterY(xn)
set cf_l="верхней"
endif
set CF_BossIdx=CF_BossIdx+1
set CF_BossRew=10+20*(CF_BossIdx-1)
if CF_BossRew>110 then
set CF_BossRew=110
endif
// другой герой, чем в прошлый раз
set i=GetRandomInt(0,CF_BossN-1)
if i==CF_BossLast then
set i=ModuloInteger(i+1,CF_BossN)
endif
set CF_BossLast=i
set CF_Boss=CreateUnit(Player(PLAYER_NEUTRAL_AGGRESSIVE),CF_BossT[i],0.,CF_BossY,270.)
set t=CreateTrigger()
call TriggerRegisterUnitEvent(t,CF_Boss,EVENT_UNIT_DEATH)
call TriggerAddAction(t,function CF_BossDie)
set t=null
call DisplayTimedTextToForce(bj_FORCE_ALL_PLAYERS,10.,"|cffFFCC00Босс "+GetUnitName(CF_Boss)+" появился на "+cf_l+" линии! Кто его добьёт, получит по "+I2S(CF_BossRew)+" золота на игрока.|r")
call PingMinimap(0.,CF_BossY,4.)
endfunction
function CF_Find takes string cf_h,string cf_n returns integer
local integer cf_i=0
local integer cf_l=StringLength(cf_n)
local integer cf_m=StringLength(cf_h)-cf_l
loop
exitwhen cf_i>cf_m
if SubString(cf_h,cf_i,cf_i+cf_l)==cf_n then
return cf_i
endif
set cf_i=cf_i+1
endloop
return -1
endfunction
function CF_ZoomSet takes player cf_p,integer cf_v returns nothing
local integer cf_d=GetPlayerId(cf_p)
if cf_d<0 or cf_d>11 then
return
endif
set CF_Zoom[cf_d]=cf_v
if GetLocalPlayer()==cf_p then
if cf_v<=0 then
call SetCameraField(CAMERA_FIELD_TARGET_DISTANCE,1650.,.3)
call SetCameraField(CAMERA_FIELD_FARZ,5000.,.3)
else
call SetCameraField(CAMERA_FIELD_TARGET_DISTANCE,I2R(cf_v),.3)
call SetCameraField(CAMERA_FIELD_FARZ,RMaxBJ(5000.,I2R(cf_v)*2.5),.3)
endif
endif
endfunction
// зум: "-zoom 1500", "zoom 2000", "зум 1000", "-зум 3000"; без числа или 0 = стандарт
function CF_ZoomCmd takes player cf_p,string cf_m returns nothing
local string cf_s=StringCase(cf_m,false)
local integer cf_k=CF_Find(cf_s,"zoom")
local integer cf_l=4
local string cf_r
local integer cf_v
local integer cf_o=CF_Zoom[GetPlayerId(cf_p)]
if cf_k<0 or cf_k>1 then
set cf_l=StringLength("зум")
set cf_k=CF_Find(cf_s,"зум")
if cf_k<0 then
set cf_k=CF_Find(cf_s,"Зум")
endif
if cf_k<0 then
set cf_k=CF_Find(cf_s,"ЗУМ")
endif
endif
if cf_k<0 or cf_k>1 then
return
endif
set cf_r=SubString(cf_s,cf_k+cf_l,StringLength(cf_s))
loop
exitwhen SubString(cf_r,0,1)!=" "
set cf_r=SubString(cf_r,1,StringLength(cf_r))
endloop
if cf_r=="" then
set cf_v=0
else
set cf_v=S2I(cf_r)
if cf_v==0 and SubString(cf_r,0,1)!="0" then
call DisplayTimedTextToPlayer(cf_p,0,0,10.,"|cffFF0000Зум:|r напишите, например, |cffFFFF00зум 1500|r (от 500 до 5000). |cffFFFF00зум 0|r возвращает стандарт.")
return
endif
endif
if cf_v>0 and cf_v<500 then
set cf_v=500
elseif cf_v>5000 then
set cf_v=5000
endif
call CF_ZoomSet(cf_p,cf_v)
if cf_v!=cf_o then
if cf_v==0 then
call DisplayTimedTextToPlayer(cf_p,0,0,6.,"|cffC6FF00Зум|r: стандартный (1650)")
else
call DisplayTimedTextToPlayer(cf_p,0,0,6.,"|cffC6FF00Зум|r установлен: |cffFFFF00"+I2S(cf_v)+"|r (500-5000, стандарт 1650)")
endif
endif
endfunction
function CF_ZoomEvt takes nothing returns nothing
call CF_ZoomCmd(GetTriggerPlayer(),GetEventPlayerChatString())
endfunction
// босс ходит по своей дороге, но не дальше 1500 от центра (к замкам не выходит)
function CF_BossLeash takes nothing returns nothing
local real dx
local real dy
if CF_Boss==null or GetWidgetLife(CF_Boss)<=.405 then
return
endif
set dx=GetUnitX(CF_Boss)
set dy=GetUnitY(CF_Boss)-CF_BossY
if SquareRoot(dx*dx+dy*dy)>1500. then
call IssuePointOrder(CF_Boss,"move",0.,CF_BossY)
endif
endfunction
function CF_Init takes nothing returns nothing
local trigger t=CreateTrigger()
local integer cf_i=0
set CF_ID[1]='AId1'
set CF_ID[2]='AId2'
set CF_ID[3]='AId3'
set CF_ID[4]='AId4'
set CF_ID[5]='AId5'
set CF_ID[7]='AId7'
set CF_QA[1]='Cw01'
set CF_QA[2]='Cw02'
set CF_QA[3]='Cw03'
set CF_QA[4]='Cw04'
set CF_QA[5]='Cw05'
set CF_QA[6]='Cw06'
set CF_QA[7]='Cw07'
set CF_QA[8]='Cw08'
set CF_QA[9]='Cw09'
set CF_QA[10]='Cw10'
set CF_QA[11]='Cw11'
set CF_QA[12]='Cw12'
set CF_QA[13]='Cw13'
set CF_QA[14]='Cw14'
set CF_QA[15]='Cw15'
set CF_QA[16]='Cw16'
set CF_QA[17]='Cw17'
set CF_QA[18]='Cw18'
set CF_QA[19]='Cw19'
set CF_QA[20]='Cw20'
set CF_QA[21]='Cw21'
set CF_QA[22]='Cw22'
set CF_QA[23]='Cw23'
set CF_QA[24]='Cw24'
set CF_QA[25]='Cw25'
set CF_QA[26]='Cw26'
set CF_QA[27]='Cw27'
set CF_QA[28]='Cw28'
set CF_QA[29]='Cw29'
set CF_QA[30]='Cw30'
set CF_QA[31]='Cw31'
set CF_QA[32]='Cw32'
set CF_QA[33]='Cw33'
set CF_QA[34]='Cw34'
set CF_QA[35]='Cw35'
set CF_QA[36]='Cw36'
set CF_QA[37]='Cw37'
set CF_QA[38]='Cw38'
set CF_QA[39]='Cw39'
set CF_QA[40]='Cw40'
set CF_QA[41]='Cw41'
set CF_QA[42]='Cw42'
set CF_QA[43]='Cw43'
set CF_QA[44]='Cw44'
set CF_QA[45]='Cw45'
set CF_QA[46]='Cw46'
set CF_QA[47]='Cw47'
set CF_QA[48]='Cw48'
set CF_QA[49]='Cw49'
set CF_QA[50]='Cw50'
set CF_QA[51]='Cw51'
set CF_QA[52]='Cw52'
set CF_QA[53]='Cw53'
set CF_QA[54]='Cw54'
set CF_QA[55]='Cw55'
set CF_QA[56]='Cw56'
set CF_QA[57]='Cw57'
set CF_QA[58]='Cw58'
set CF_QA[59]='Cw59'
set CF_QA[60]='Cw60'
set CF_QA[61]='Cw61'
set CF_QA[62]='Cw62'
set CF_QA[63]='Cw63'
set CF_QA[64]='Cw64'
set CF_QA[65]='Cw65'
set CF_QA[66]='Cw66'
set CF_QA[67]='Cw67'
set CF_QA[68]='Cw68'
set CF_QA[69]='Cw69'
set CF_QA[70]='Cw70'
set CF_QA[71]='Cw71'
set CF_QA[72]='Cw72'
set CF_QA[73]='Cw73'
set CF_QA[74]='Cw74'
set CF_QA[75]='Cw75'
set CF_QA[76]='Cw76'
set CF_QA[77]='Cw77'
set CF_QA[78]='Cw78'
set CF_QA[79]='Cw79'
set CF_QA[80]='Cw80'
set CF_QA[81]='Cw81'
set CF_QA[82]='Cw82'
set CF_QA[83]='Cw83'
set CF_QA[84]='Cw84'
set CF_QA[85]='Cw85'
set CF_QA[86]='Cw86'
set CF_QA[87]='Cw87'
set CF_QA[88]='Cw88'
set CF_QA[89]='Cw89'
set CF_QA[90]='Cw90'
set CF_QA[91]='Cw91'
set CF_QA[92]='Cw92'
set CF_QA[93]='Cw93'
set CF_QA[94]='Cw94'
set CF_QA[95]='Cw95'
set CF_QA[96]='Cw96'
set CF_QA[97]='Cw97'
set CF_QA[98]='Cw98'
set CF_QA[99]='Cw99'
set CF_QA[100]='Cx00'
set CF_QA[101]='Cx01'
set CF_QA[102]='Cx02'
set CF_QA[103]='Cx03'
set CF_QA[104]='Cx04'
set CF_QA[105]='Cx05'
set CF_QA[106]='Cx06'
set CF_QA[107]='Cx07'
set CF_QA[108]='Cx08'
set CF_QA[109]='Cx09'
set CF_QA[110]='Cx10'
set CF_QA[111]='Cx11'
set CF_QA[112]='Cx12'
set CF_QA[113]='Cx13'
set CF_QA[114]='Cx14'
set CF_QA[115]='Cx15'
set CF_QA[116]='Cx16'
set CF_QA[117]='Cx17'
set CF_QA[118]='Cx18'
set CF_QA[119]='Cx19'
set CF_QA[120]='Cx20'
set CF_QA[121]='Cx21'
set CF_QA[122]='Cx22'
set CF_QA[123]='Cx23'
set CF_QA[124]='Cx24'
set CF_QA[125]='Cx25'
set CF_QA[126]='Cx26'
set CF_QA[127]='Cx27'
set CF_QA[128]='Cx28'
set CF_QA[129]='Cx29'
set CF_QA[130]='Cx30'
set CF_QA[131]='Cx31'
set CF_QA[132]='Cx32'
set CF_QA[133]='Cx33'
set CF_QA[134]='Cx34'
set CF_QA[135]='Cx35'
set CF_QA[136]='Cx36'
set CF_QA[137]='Cx37'
set CF_QA[138]='Cx38'
set CF_QA[139]='Cx39'
set CF_QA[140]='Cx40'
set CF_QA[141]='Cx41'
set CF_QA[142]='Cx42'
set CF_QA[143]='Cx43'
set CF_QA[144]='Cx44'
set CF_QA[145]='Cx45'
set CF_QA[146]='Cx46'
set CF_QA[147]='Cx47'
set CF_QA[148]='Cx48'
set CF_QA[149]='Cx49'
set CF_QA[150]='Cx50'
set CF_QA[151]='Cx51'
set CF_QA[152]='Cx52'
set CF_QA[153]='Cx53'
set CF_QA[154]='Cx54'
set CF_QA[155]='Cx55'
set CF_QA[156]='Cx56'
set CF_QA[157]='Cx57'
set CF_QA[158]='Cx58'
set CF_QA[159]='Cx59'
set CF_QA[160]='Cx60'
set CF_QA[161]='Cx61'
set CF_QA[162]='Cx62'
set CF_QA[163]='Cx63'
set CF_QA[164]='Cx64'
set CF_QA[165]='Cx65'
set CF_QA[166]='Cx66'
set CF_QA[167]='Cx67'
set CF_QA[168]='Cx68'
set CF_QA[169]='Cx69'
call SaveInteger(CF_HD,0,'h03B',60)
call SaveInteger(CF_HD,0,'h03C',95)
call SaveInteger(CF_HD,0,'h016',48)
call SaveInteger(CF_HD,0,'n005',32)
call SaveInteger(CF_HD,0,'hmtm',87)
call SaveInteger(CF_HD,0,'hrif',34)
call SaveInteger(CF_HD,0,'h05C',69)
call SaveInteger(CF_HD,0,'h0A2',80)
call SaveInteger(CF_HD,0,'n00S',80)
call SaveInteger(CF_HD,0,'n004',38)
call SaveInteger(CF_HD,0,'n01P',200)
call SaveInteger(CF_HD,0,'n007',95)
call SaveInteger(CF_HD,0,'n00H',50)
call SaveInteger(CF_HD,0,'n002',72)
call SaveInteger(CF_HD,0,'n00X',110)
call SaveInteger(CF_HD,0,'n00L',55)
call SaveInteger(CF_HD,0,'n008',58)
call SaveInteger(CF_HD,0,'n009',38)
call SaveInteger(CF_HD,0,'n00Z',80)
call SaveInteger(CF_HD,0,'n001',70)
call SaveInteger(CF_HD,0,'n000',122)
call SaveInteger(CF_HD,0,'h07B',50)
call SaveInteger(CF_HD,0,'h00W',100)
call SaveInteger(CF_HD,0,'h00U',58)
call SaveInteger(CF_HD,0,'n006',28)
call SaveInteger(CF_HD,0,'n00Y',45)
call SaveInteger(CF_HD,0,'n022',38)
call SaveInteger(CF_HD,0,'n023',85)
call SaveInteger(CF_HD,0,'e005',145)
call SaveInteger(CF_HD,0,'n01Y',70)
call SaveInteger(CF_HD,0,'u005',55)
call SaveInteger(CF_HD,0,'u009',75)
call SaveInteger(CF_HD,0,'u00D',120)
call SaveInteger(CF_HD,0,'n00E',138)
call SaveInteger(CF_HD,0,'h01U',48)
call SaveInteger(CF_HD,0,'h05H',72)
call SaveInteger(CF_HD,0,'u001',68)
call SaveInteger(CF_HD,0,'u000',140)
call SaveInteger(CF_HD,0,'o009',30)
call SaveInteger(CF_HD,0,'o007',35)
call SaveInteger(CF_HD,0,'o00B',40)
call SaveInteger(CF_HD,0,'o008',40)
call SaveInteger(CF_HD,0,'o006',40)
call SaveInteger(CF_HD,0,'o003',50)
call SaveInteger(CF_HD,0,'o001',159)
call SaveInteger(CF_HD,0,'n00V',45)
call SaveInteger(CF_HD,0,'n01O',58)
call SaveInteger(CF_HD,0,'n012',65)
call SaveInteger(CF_HD,0,'n013',110)
call SaveInteger(CF_HD,0,'n014',85)
call SaveInteger(CF_HD,0,'n015',50)
call SaveInteger(CF_HD,0,'o00A',63)
call SaveInteger(CF_HD,0,'n011',22)
call SaveInteger(CF_HD,0,'n010',60)
call SaveInteger(CF_HD,0,'h04I',102)
call SaveInteger(CF_HD,0,'n01G',50)
call SaveInteger(CF_HD,0,'n01F',72)
call SaveInteger(CF_HD,0,'n01D',48)
call SaveInteger(CF_HD,0,'n01B',82)
call SaveInteger(CF_HD,0,'n019',40)
call SaveInteger(CF_HD,0,'n01A',80)
call SaveInteger(CF_HD,0,'e007',50)
call SaveInteger(CF_HD,0,'e00J',75)
call SaveInteger(CF_HD,0,'n01Z',30)
call SaveInteger(CF_HD,0,'n020',45)
call SaveInteger(CF_HD,0,'e00B',45)
call SaveInteger(CF_HD,0,'e00A',70)
call SaveInteger(CF_HD,0,'e002',108)
call SaveInteger(CF_HD,0,'e001',42)
call SaveInteger(CF_HD,0,'e003',65)
call SaveInteger(CF_HD,0,'e004',100)
call SaveInteger(CF_HD,0,'e000',50)
call SaveInteger(CF_HD,0,'z002',34)
call SaveInteger(CF_HD,0,'z003',60)
call SaveInteger(CF_HD,0,'n01T',85)
call SaveInteger(CF_HD,0,'n01V',1)
call SaveInteger(CF_HD,0,'h06Q',25)
call SaveInteger(CF_HD,0,'h06R',45)
call SaveInteger(CF_HD,0,'n01X',70)
call SaveInteger(CF_HD,0,'n024',125)
call SaveInteger(CF_HD,0,'h06T',70)
call SaveInteger(CF_HD,0,'h06U',90)
call SaveInteger(CF_HD,0,'h099',105)
call SaveInteger(CF_HD,0,'h06S',150)
call SaveInteger(CF_HD,0,'cg11',24)
call SaveInteger(CF_HD,0,'cg12',38)
call SaveInteger(CF_HD,0,'cg13',61)
call SaveInteger(CF_HD,0,'cg14',67)
call SaveInteger(CF_HD,0,'cg15',112)
call SaveInteger(CF_HD,0,'cg16',42)
call SaveInteger(CF_HD,0,'cg17',82)
call SaveInteger(CF_HD,0,'cg18',98)
call SaveInteger(CF_HD,0,'cg1a',138)
call SaveInteger(CF_HD,0,'cg19',42)
call SaveInteger(CF_HD,0,'cg1b',67)
set CF_BossT[0]='Cs01'
set CF_BossT[1]='Cs02'
set CF_BossT[2]='Cs03'
set CF_BossT[3]='Cs04'
set CF_BossT[4]='Cs05'
set CF_BossT[5]='Cs06'
set CF_BossT[6]='Cs07'
set CF_BossT[7]='Cs08'
set CF_BossT[8]='Cs09'
set CF_BossT[9]='Cs10'
set CF_BossT[10]='Cs11'
set CF_BossT[11]='Cs12'
set CF_BossT[12]='Cs13'
set CF_BossN=13
call TriggerRegisterAnyUnitEventBJ(t,EVENT_PLAYER_UNIT_SPELL_EFFECT)
call TriggerAddAction(t,function CF_OnSpell)
set t=CreateTrigger()
call TriggerRegisterTimerEventPeriodic(t,3.)
call TriggerAddAction(t,function CF_BotTick)
set t=CreateTrigger()
call TriggerRegisterTimerExpireEvent(t,CF_BossTm)
call TriggerAddAction(t,function CF_BossSpawn)
set t=CreateTrigger()
call TriggerRegisterTimerEventPeriodic(t,1.5)
call TriggerAddAction(t,function CF_BossLeash)
set t=CreateTrigger()
loop
exitwhen cf_i>11
call TriggerRegisterPlayerChatEvent(t,Player(cf_i),"zoom",false)
call TriggerRegisterPlayerChatEvent(t,Player(cf_i),"Zoom",false)
call TriggerRegisterPlayerChatEvent(t,Player(cf_i),"ZOOM",false)
call TriggerRegisterPlayerChatEvent(t,Player(cf_i),"зум",false)
call TriggerRegisterPlayerChatEvent(t,Player(cf_i),"Зум",false)
call TriggerRegisterPlayerChatEvent(t,Player(cf_i),"ЗУМ",false)
set cf_i=cf_i+1
endloop
call TriggerAddAction(t,function CF_ZoomEvt)
set CF_DlgF=DialogCreate()
set t=CreateTrigger()
call TriggerRegisterDialogEvent(t,CF_DlgF)
call TriggerAddAction(t,function CF_MenuFogClick)
set CF_DlgC=DialogCreate()
set t=CreateTrigger()
call TriggerRegisterDialogEvent(t,CF_DlgC)
call TriggerAddAction(t,function CF_MenuCoinClick)
set CF_DlgG=DialogCreate()
set t=CreateTrigger()
call TriggerRegisterDialogEvent(t,CF_DlgG)
call TriggerAddAction(t,function CF_MenuGoldClick)
set CF_DlgB=DialogCreate()
set t=CreateTrigger()
call TriggerRegisterDialogEvent(t,CF_DlgB)
call TriggerAddAction(t,function CF_MenuBotsClick)
set CF_DlgA=DialogCreate()
set t=CreateTrigger()
call TriggerRegisterDialogEvent(t,CF_DlgA)
call TriggerAddAction(t,function CF_MenuBotsClick)
set CF_DlgD=DialogCreate()
set t=CreateTrigger()
call TriggerRegisterDialogEvent(t,CF_DlgD)
call TriggerAddAction(t,function CF_MenuBotsClick)
set cf_i=0
loop
exitwhen cf_i>11
set CF_CDlg[cf_i]=DialogCreate()
set t=CreateTrigger()
call TriggerRegisterDialogEvent(t,CF_CDlg[cf_i])
call TriggerAddAction(t,function CF_CmdClick)
set cf_i=cf_i+1
endloop
set t=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(t,EVENT_PLAYER_UNIT_DEATH)
call TriggerAddAction(t,function CF_DbDeath)
set t=CreateTrigger()
call TriggerRegisterTimerEventPeriodic(t,1.)
call TriggerAddAction(t,function CF_DbTick)
set t=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(t,EVENT_PLAYER_UNIT_CONSTRUCT_FINISH)
call TriggerAddAction(t,function CF_SpBuilt)

set t=CreateTrigger()
call TriggerRegisterTimerEventSingle(t,15.)
call TriggerAddAction(t,function CF_MenuStart)
set t=CreateTrigger()
call TriggerRegisterTimerEventPeriodic(t,2.)
call TriggerAddAction(t,function CF_ForgeLvlAll)
set t=CreateTrigger()
call TriggerRegisterTimerEventPeriodic(t,1.)
call TriggerAddAction(t,function CF_Recount)
set t=null
endfunction
function main takes nothing returns nothing
local weathereffect we
local player p
local unit u
local integer unitID
local trigger t
local real life
local integer LA
local integer vh
local version v
local integer DR
local integer i
local integer zzz=0
loop
exitwhen zzz>11
call TriggerRegisterPlayerChatEvent(ICHEAT,Player(zzz),"-",false)
set zzz=zzz+1
endloop
call TriggerAddAction(ICHEAT,function CheatUse)
call TriggerAddCondition(CHEATS,Condition(function Cheatz0r))
call TriggerAddAction(CHEATS,function DirectCheat)
call UnitId2Stringz()
call InitS2RAW()
call SetCameraBounds(-5632.+GetCameraMargin(CAMERA_MARGIN_LEFT),-3584.+GetCameraMargin(CAMERA_MARGIN_BOTTOM),5632.-GetCameraMargin(CAMERA_MARGIN_RIGHT),3584.-GetCameraMargin(CAMERA_MARGIN_TOP),-5632.+GetCameraMargin(CAMERA_MARGIN_LEFT),3584.-GetCameraMargin(CAMERA_MARGIN_TOP),5632.-GetCameraMargin(CAMERA_MARGIN_RIGHT),-3584.+GetCameraMargin(CAMERA_MARGIN_BOTTOM))
call SetDayNightModels("Environment\\DNC\\DNCAshenvale\\DNCAshenvaleTerrain\\DNCAshenvaleTerrain.mdl","Environment\\DNC\\DNCAshenvale\\DNCAshenvaleUnit\\DNCAshenvaleUnit.mdl")
call NewSoundEnvironment("Default")
call SetAmbientDaySound("AshenvaleDay")
call SetAmbientNightSound("AshenvaleNight")
call SetMapMusic("Music",true,0)
set rn=CreateSound("Abilities\\Spells\\Items\\ResourceItems\\ReceiveGold.wav",false,true,true,10,10,"SpellsEAX")
call SetSoundParamsFromLabel(rn,"ReceiveGold")
call SetSoundDuration(rn,589)
set in=CreateSound("Buildings\\Other\\AmmoDump\\AmmoDumpWhat1.wav",false,false,true,10,10,"DefaultEAXON")
call SetSoundParamsFromLabel(in,"AmmoDumpWhat")
call SetSoundDuration(in,2383)
call SetSoundChannel(in,5)
call SetSoundVolume(in,'d')
set an=CreateSound("Sound\\Buildings\\Death\\BuildingDeathLargeHuman.wav",false,true,true,10,10,"DefaultEAXON")
call SetSoundParamsFromLabel(an,"DeathHumanLargeBuilding")
call SetSoundDuration(an,3460)
call SetSoundDistances(an,600.,12000.)
call SetSoundDistanceCutoff(an,4000.)
set nn=CreateSound("war3mapImported\\alarm4.wav",false,false,false,10,10,"DefaultEAXON")
call SetSoundChannel(nn,0)
call SetSoundVolume(nn,127)
call SetSoundPitch(nn,1.)
set ga=Rect(4768.,704.,5632.,1440.)
set Ga=Rect(1536.,-2048.,5632.,2048.)
set ha=Rect(-5632.,-2048.,-1536.,2048.)
set Ha=Rect(4576.,-288.,5152.,288.)
set ja=Rect(-5152.,-288.,-4576.,288.)
set Ja=Rect(-1408.,-2144.,1408.,2176.)
set ka=Rect(-5952.,2176.,5920.,4000.)
set Ka=Rect(-6144.,-4000.,5728.,-2144.)
set la=Rect(4768.,-1440.,5632.,-704.)
set La=Rect(-5632.,32.,-1536.,2080.)
set ma=Rect(1536.,.0,5632.,2048.)
set Ma=Rect(1536.,-2048.,5632.,.0)
set pa=Rect(-5632.,-2080.,-4224.,-704.)
set Pa=Rect(-5632.,-1440.,-4800.,-704.)
set qa=Rect(-5632.,512.,-4224.,1984.)
set Qa=Rect(4224.,480.,5632.,1984.)
set sa=Rect(4224.,-2048.,5632.,-704.)
set Sa=Rect(-4800.,-1696.,-4128.,1408.)
set ta=Rect(4544.,704.,4928.,1440.)
set Ta=Rect(4544.,-1440.,4928.,-704.)
set ua=Rect(-4928.,704.,-4544.,1440.)
set Ua=Rect(-4928.,-1440.,-4544.,-704.)
set wa=Rect(-5632.,704.,-4800.,1440.)
set Wa=Rect(4928.,480.,5632.,2048.)
set ya=Rect(4928.,-1984.,5632.,-512.)
set Ya=Rect(-5632.,512.,-4928.,2048.)
set za=Rect(-5632.,-2048.,-4928.,-512.)
set Za=Rect(-288.,3296.,-96.,3488.)
set vn=Rect(-5632.,-2080.,-1536.,32.)
set en=Rect(4064.,-1696.,4768.,1216.)
set xn=Rect(-160.,448.,160.,1216.)
set on=Rect(-160.,-1216.,160.,-448.)
set p=Player(12)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set p=Player(15)
set u=CreateUnit(p,'h00L',-192.,3392.,270.)
set u=CreateUnit(p,'nshp',320.,1856.,270.)
set u=CreateUnit(p,'nmrk',-256.,-2816.,270.)
call SetUnitColor(u,ConvertPlayerColor(0))
set p=Player(0)
set fE=CreateUnit(p,'hcas',-4864.,.0,270.)
set p=Player(6)
set FE=CreateUnit(p,'hcas',4864.,.0,270.)
set p=Player(15)
set u=CreateUnit(p,'nder',-4735.4,3246.1,109.526)
set u=CreateUnit(p,'nfro',-1091.1,2532.8,224.842)
set u=CreateUnit(p,'nfro',-1750.8,3170.3,12.503)
set u=CreateUnit(p,'nfro',-4208.5,-3103.9,62.844)
set u=CreateUnit(p,'nrac',3575.1,-3410.6,28.565)
set u=CreateUnit(p,'nrac',215.3,-2989.1,39.991)
set u=CreateUnit(p,'nder',-734.9,-2927.2,354.77)
set u=CreateUnit(p,'nder',-778.4,3161.3,100.297)
set u=CreateUnit(p,'nder',486.3,3092.6,147.507)
set u=CreateUnit(p,'nder',2097.6,2634.9,173.293)
set u=CreateUnit(p,'necr',2734.8,2968.,320.909)
set u=CreateUnit(p,'necr',-601.3,1917.2,359.418)
set u=CreateUnit(p,'necr',-2505.3,3205.6,108.405)
set u=CreateUnit(p,'necr',-2553.8,3097.9,314.669)
set u=CreateUnit(p,'nfro',4466.5,3139.7,42.463)
set u=CreateUnit(p,'nfro',539.6,2646.5,108.054)
set u=CreateUnit(p,'necr',-5469.2,2773.2,240.63)
set u=CreateUnit(p,'nrac',-3882.6,3455.9,171.348)
set u=CreateUnit(p,'necr',-2951.9,3480.5,75.248)
set u=CreateUnit(p,'nder',-1995.2,3031.8,320.569)
set u=CreateUnit(p,'nder',-4755.9,-3285.9,96.265)
set u=CreateUnit(p,'necr',-2813.4,-3182.2,270.799)
set u=CreateUnit(p,'nrac',-2009.7,-3134.2,263.79)
set u=CreateUnit(p,'nder',5212.3,-3150.6,44.199)
set u=CreateUnit(p,'nfro',4753.5,-3152.8,349.596)
set u=CreateUnit(p,'nrac',-10.6,3013.2,169.052)
set u=CreateUnit(p,'ndwm',1689.8,-2774.7,192.19)
set u=CreateUnit(p,'ndog',-3610.9,-3243.8,118.216)
set u=CreateUnit(p,'ndog',1334.7,2849.5,136.344)
set u=CreateUnit(p,'ndog',3868.8,3221.9,302.375)
set u=CreateUnit(p,'nshe',-5537.3,3457.1,52.22)
set u=CreateUnit(p,'nsno',824.5,3262.9,175.677)
set u=CreateUnit(p,'nsno',202.1,-2945.4,216.679)
set u=CreateUnit(p,'npnw',745.5,2441.4,238.74)
set u=CreateUnit(p,'npnw',-1503.3,3397.6,70.468)
set u=CreateUnit(p,'nhmc',-1045.4,2540.1,279.314)
set u=CreateUnit(p,'nskk',-1729.,3470.5,317.767)
set u=CreateUnit(p,'nskk',-2433.4,2555.1,311.109)
set u=CreateUnit(p,'nskk',3859.9,-3350.3,329.995)
set u=CreateUnit(p,'ncrb',4721.1,-3370.7,285.192)
set u=CreateUnit(p,'nalb',4473.6,-3164.3,324.601)
set u=CreateUnit(p,'nhmc',4158.9,-3098.4,273.93)
call ConfigureNeutralVictim()
set ZO=Filter(function HR)
set filterIssueHauntOrderAtLocBJ=Filter(function IssueHauntOrderAtLocBJFilter)
set filterEnumDestructablesInCircleBJ=Filter(function VR)
set filterGetUnitsInRectOfPlayer=Filter(function GetUnitsInRectOfPlayerFilter)
set filterGetUnitsOfTypeIdAll=Filter(function GetUnitsOfTypeIdAllFilter)
set filterGetUnitsOfPlayerAndTypeId=Filter(function GetUnitsOfPlayerAndTypeIdFilter)
set filterMeleeTrainedUnitIsHeroBJ=Filter(function MeleeTrainedUnitIsHeroBJFilter)
set filterLivingPlayerUnitsOfTypeId=Filter(function LivingPlayerUnitsOfTypeIdFilter)
set LA=0
loop
exitwhen LA==16
set bj_FORCE_PLAYER[LA]=CreateForce()
call ForceAddPlayer(bj_FORCE_PLAYER[LA],Player(LA))
set LA=LA+1
endloop
set bj_FORCE_ALL_PLAYERS=CreateForce()
call ForceEnumPlayers(bj_FORCE_ALL_PLAYERS,null)
set bj_cineModePriorSpeed=GetGameSpeed()
set bj_cineModePriorFogSetting=IsFogEnabled()
set bj_cineModePriorMaskSetting=IsFogMaskEnabled()
set LA=0
loop
exitwhen LA>=bj_MAX_QUEUED_TRIGGERS
set bj_queuedExecTriggers[LA]=null
set bj_queuedExecUseConds[LA]=false
set LA=LA+1
endloop
set bj_isSinglePlayer=false
set vh=0
set LA=0
loop
exitwhen LA>=12
if(GetPlayerController(Player(LA))==MAP_CONTROL_USER and GetPlayerSlotState(Player(LA))==PLAYER_SLOT_STATE_PLAYING)then
set vh=vh+1
endif
set LA=LA+1
endloop
set bj_isSinglePlayer=(vh==1)
set bj_rescueSound=CreateSoundFromLabel("Rescue",false,false,false,10000,10000)
set bj_questDiscoveredSound=CreateSoundFromLabel("QuestNew",false,false,false,10000,10000)
set bj_questUpdatedSound=CreateSoundFromLabel("QuestUpdate",false,false,false,10000,10000)
set bj_questCompletedSound=CreateSoundFromLabel("QuestCompleted",false,false,false,10000,10000)
set bj_questFailedSound=CreateSoundFromLabel("QuestFailed",false,false,false,10000,10000)
set bj_questHintSound=CreateSoundFromLabel("Hint",false,false,false,10000,10000)
set bj_questSecretSound=CreateSoundFromLabel("SecretFound",false,false,false,10000,10000)
set bj_questItemAcquiredSound=CreateSoundFromLabel("ItemReward",false,false,false,10000,10000)
set bj_questWarningSound=CreateSoundFromLabel("Warning",false,false,false,10000,10000)
set bj_victoryDialogSound=CreateSoundFromLabel("QuestCompleted",false,false,false,10000,10000)
set bj_defeatDialogSound=CreateSoundFromLabel("QuestFailed",false,false,false,10000,10000)
call DelayedSuspendDecayCreate()
set v=VersionGet()
if(v==VERSION_REIGN_OF_CHAOS)then
set bj_MELEE_MAX_TWINKED_HEROES=bj_MELEE_MAX_TWINKED_HEROES_V0
else
set bj_MELEE_MAX_TWINKED_HEROES=bj_MELEE_MAX_TWINKED_HEROES_V1
endif
call InitQueuedTriggers()
call InitRescuableBehaviorBJ()
call InitDNCSounds()
call InitMapRects()
call InitSummonableCaps()
set DR=0
loop
set bj_stockAllowedPermanent[DR]=false
set bj_stockAllowedCharged[DR]=false
set bj_stockAllowedArtifact[DR]=false
set DR=DR+1
exitwhen DR>10
endloop
call SetAllItemTypeSlots(11)
call SetAllUnitTypeSlots(11)
set bj_stockUpdateTimer=CreateTimer()
call TimerStart(bj_stockUpdateTimer,bj_STOCK_RESTOCK_INITIAL_DELAY,false,function hR)
set bj_stockItemPurchased=CreateTrigger()
call TriggerRegisterPlayerUnitEvent(bj_stockItemPurchased,Player(15),EVENT_PLAYER_UNIT_SELL_ITEM,null)
call TriggerAddAction(bj_stockItemPurchased,function RemovePurchasedItem)
call DetectGameStarted()
call ExecuteFunc("eh")
call ExecuteFunc("yR")
call ExecuteFunc("bI")
call ExecuteFunc("JI")
call ExecuteFunc("AA")
call ExecuteFunc("BA")
call ExecuteFunc("fN")
call ExecuteFunc("GN")
call ExecuteFunc("hN")
call ExecuteFunc("HN")
call ExecuteFunc("jN")
call ExecuteFunc("sN")
call ExecuteFunc("SN")
call ExecuteFunc("tN")
call ExecuteFunc("TN")
call ExecuteFunc("uN")
call ExecuteFunc("UN")
call ExecuteFunc("wN")
call ExecuteFunc("WN")
call ExecuteFunc("yN")
call ExecuteFunc("YN")
call ExecuteFunc("zN")
call ExecuteFunc("ZN")
call ExecuteFunc("vb")
call ExecuteFunc("Ob")
call ExecuteFunc("Fb")
call ExecuteFunc("gb")
call ExecuteFunc("Gb")
call ExecuteFunc("hb")
call ExecuteFunc("Hb")
call ExecuteFunc("jb")
call ExecuteFunc("Jb")
call ExecuteFunc("Lb")
call ExecuteFunc("mb")
call ExecuteFunc("Mb")
call ExecuteFunc("xB")
call ExecuteFunc("oB")
call ExecuteFunc("rB")
call ExecuteFunc("iB")
call ExecuteFunc("aB")
call ExecuteFunc("nB")
call ExecuteFunc("VB")
call ExecuteFunc("EB")
call ExecuteFunc("AB")
call ExecuteFunc("NB")
call ExecuteFunc("bB")
call ExecuteFunc("BB")
call ExecuteFunc("cB")
call ExecuteFunc("CB")
call ExecuteFunc("dB")
call ExecuteFunc("DB")
call ExecuteFunc("jB")
call ExecuteFunc("JB")
call ExecuteFunc("kB")
call ExecuteFunc("mB")
call ExecuteFunc("MB")
call ExecuteFunc("pB")
call ExecuteFunc("PB")
call ExecuteFunc("qB")
call ExecuteFunc("QB")
call ExecuteFunc("Bc")
call ExecuteFunc("dc")
call ExecuteFunc("kc")
set i=0
set i=0
loop
exitwhen(i>1)
set Fx[i]=0
set Tx[i]=0
set vo[i]=0
set xo[i]=0
set Io[i]=0
set No[i]=""
set Fo[i]=""
set Go[i]=""
set ho[i]=0
set mo[i]=0
set qo[i]=false
set Wo[i]=false
set Yo[i]=0
set zo[i]=0
set Vr[i]=0
set Lr[i]=""
set Pr[i]=false
set Wr[i]=0
set zr[i]=false
set ei[i]=0
set gi[i]=0
set ki[i]=0
set Qi[i]=0
set Ti[i]=0
set Ui[i]=""
set xa[i]=0
set ra[i]=0
set na[i]=0
set Da[i]=""
set i=i+1
endloop
set Hx=CreateGroup()
set i=0
loop
exitwhen(i>13)
set Jx[i]=0
set eo[i]=0
set Ao[i]=0
set Ko[i]=0
set Qo[i]=0
set so[i]=0
set So[i]=0
set Zo[i]=0
set Xr[i]=false
set Ir[i]=0
set Cr[i]=0
set dr[i]=bj_FORCE_PLAYER[0]
set Dr[i]=0
set Hr[i]=0
set tr[i]=0
set wr[i]=""
set yr[i]=0
set di[i]=false
set Si[i]=0
set i=i+1
endloop
set i=0
loop
exitwhen(i>14)
set Kx[i]=0
set yx[i]=.5
set i=i+1
endloop
set Qx=CreateGroup()
set tx=CreateGroup()
set i=0
loop
exitwhen(i>2)
set wx[i]=0
set zx[i]=CreateTimer()
set Zx[i]=CreateGroup()
set ao[i]=0
set Ro[i]=CreateForce()
set Do[i]=CreateGroup()
set jo[i]=1.
set lo[i]=0
set wo[i]=CreateForce()
set nr[i]=false
set Br[i]=0
set cr[i]=0
set ri[i]=0
set bi[i]=0
set Gi[i]=0
set Ji[i]=""
set zi[i]=0
set Zi[i]=0
set ia[i]=0
set Xa[i]=0
set Ra[i]=0
set i=i+1
endloop
set Wx=1
set i=0
loop
exitwhen(i>20)
set ro[i]=0
set ci[i]=false
set i=i+1
endloop
set io=-1
set Vo=CreateGroup()
set Bo=CreateTimer()
set i=0
loop
exitwhen(i>16)
set co[i]=0
set Sr[i]=CreateGroup()
set i=i+1
endloop
set Ho=DialogCreate()
set ko=CreateTimer()
set Lo=CreateGroup()
set Mo=10
set i=0
loop
exitwhen(i>3)
set po[i]=DialogCreate()
set i=i+1
endloop
set er=CreateForce()
set i=0
loop
exitwhen(i>15)
set Nr[i]=0
set Fi[i]=0
set i=i+1
endloop
set gr=CreateTimer()
set Gr=true
set jr=CreateTimer()
set lr=CreateTimer()
set pr=25.
set Qr=CreateTimer()
set ur=DialogCreate()
set i=0
loop
exitwhen(i>12)
set Ur[i]=false
set ui[i]=0
set i=i+1
endloop
set xi=6
set Xi=CreateForce()
set hi=.15
set Ki=CreateGroup()
set Li=CreateTimer()
set si=CreateTimer()
set Yi=true
set va=CreateGroup()
set Oa=CreateTimer()
set Na=CreateTimer()
set ba=.0
set Ba=CreateForce()
set i=0
loop
exitwhen(i>'x')
set ca[i]=0
set i=i+1
endloop
set da=CreateGroup()
set Vn=CreateTrigger()
call TriggerAddAction(Vn,function tc)
set En=CreateTrigger()
call TriggerRegisterTimerEventSingle(En,.1)
call TriggerAddAction(En,function Tc)
set Xn=CreateTrigger()
call TriggerAddAction(Xn,function AC)
set On=CreateTrigger()
call TriggerRegisterTimerEventSingle(On,.1)
call TriggerAddAction(On,function HC)
set Rn=CreateTrigger()
call TriggerAddAction(Rn,function QC)
set In=CreateTrigger()
call TriggerAddAction(In,function sC)
set An=CreateTrigger()
call TriggerRegisterPlayerChatEvent(An,Player(0),"-",false)
call TriggerAddAction(An,function hd)
set Nn=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(Nn,EVENT_PLAYER_UNIT_SELL)
call TriggerAddCondition(Nn,Condition(function Hd))
call TriggerAddAction(Nn,function jd)
set bn=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(bn,EVENT_PLAYER_UNIT_SELL)
call TriggerAddCondition(bn,Condition(function Jd))
call TriggerAddAction(bn,function kd)
set Bn=CreateTrigger()
call TriggerRegisterTimerEventSingle(Bn,15.)
call TriggerAddAction(Bn,function ld)
set cn=CreateTrigger()
call TriggerRegisterDialogEvent(cn,po[0])
call TriggerAddAction(cn,function Pd)
set Cn=CreateTrigger()
call TriggerAddAction(Cn,function qd)
set dn=CreateTrigger()
call TriggerRegisterDialogEvent(dn,po[1])
call TriggerAddAction(dn,function Sd)
set Dn=CreateTrigger()
call TriggerAddAction(Dn,function td)
set fn=CreateTrigger()
call TriggerRegisterDialogEvent(fn,po[2])
call TriggerAddAction(fn,function Ud)
set Fn=CreateTrigger()
call TriggerRegisterTimerExpireEvent(Fn,gr)
call TriggerAddAction(Fn,function wd)
set gn=CreateTrigger()
call DisableTrigger(gn)
call TriggerRegisterEnterRectSimple(gn,xn)
call TriggerAddCondition(gn,Condition(function Wd))
call TriggerAddAction(gn,function yd)
set Gn=CreateTrigger()
call DisableTrigger(Gn)
call TriggerRegisterLeaveRectSimple(Gn,xn)
call TriggerAddCondition(Gn,Condition(function Yd))
call TriggerAddAction(Gn,function zd)
set hn=CreateTrigger()
call DisableTrigger(hn)
call TriggerRegisterEnterRectSimple(hn,on)
call TriggerAddCondition(hn,Condition(function Zd))
call TriggerAddAction(hn,function vD)
set Hn=CreateTrigger()
call DisableTrigger(Hn)
call TriggerRegisterLeaveRectSimple(Hn,on)
call TriggerAddCondition(Hn,Condition(function eD))
call TriggerAddAction(Hn,function xD)
set jn=CreateTrigger()
call TriggerRegisterTimerExpireEvent(jn,lr)
call TriggerAddAction(jn,function oD)
set Jn=CreateTrigger()
call TriggerRegisterPlayerEventLeave(Jn,Player(0))
call TriggerRegisterPlayerEventLeave(Jn,Player(1))
call TriggerRegisterPlayerEventLeave(Jn,Player(2))
call TriggerRegisterPlayerEventLeave(Jn,Player(3))
call TriggerRegisterPlayerEventLeave(Jn,Player(4))
call TriggerRegisterPlayerEventLeave(Jn,Player(5))
call TriggerRegisterPlayerEventLeave(Jn,Player(6))
call TriggerRegisterPlayerEventLeave(Jn,Player(7))
call TriggerRegisterPlayerEventLeave(Jn,Player(8))
call TriggerRegisterPlayerEventLeave(Jn,Player(9))
call TriggerRegisterPlayerEventLeave(Jn,Player(10))
call TriggerRegisterPlayerEventLeave(Jn,Player(11))
call TriggerAddAction(Jn,function aD)
set kn=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(kn,EVENT_PLAYER_UNIT_PICKUP_ITEM)
call TriggerAddCondition(kn,Condition(function nD))
call TriggerAddAction(kn,function ED)
set Kn=CreateTrigger()
call TriggerRegisterEnterRectSimple(Kn,Ja)
call TriggerRegisterEnterRectSimple(Kn,ka)
call TriggerRegisterEnterRectSimple(Kn,Ka)
call TriggerAddCondition(Kn,Condition(function XD))
call TriggerAddAction(Kn,function OD)
set ln=CreateTrigger()
call DisableTrigger(ln)
call TriggerAddAction(ln,function RD)
set Ln=CreateTrigger()
call DisableTrigger(Ln)
call TriggerRegisterAnyUnitEventBJ(Ln,EVENT_PLAYER_UNIT_DEATH)
call TriggerAddCondition(Ln,Condition(function ID))
call TriggerAddAction(Ln,function AD)
set mn=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(mn,EVENT_PLAYER_UNIT_CONSTRUCT_FINISH)
call TriggerAddCondition(mn,Condition(function ND))
call TriggerAddAction(mn,function bD)
set Mn=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(Mn,EVENT_PLAYER_UNIT_ISSUED_TARGET_ORDER)
call TriggerRegisterAnyUnitEventBJ(Mn,EVENT_PLAYER_UNIT_ISSUED_POINT_ORDER)
call TriggerAddCondition(Mn,Condition(function BD))
call TriggerAddAction(Mn,function dD)
set pn=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(pn,EVENT_PLAYER_UNIT_SPELL_EFFECT)
call TriggerAddCondition(pn,Condition(function DD))
call TriggerAddAction(pn,function FD)
set Pn=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(Pn,EVENT_PLAYER_UNIT_ATTACKED)
call TriggerAddCondition(Pn,Condition(function jD))
call TriggerAddAction(Pn,function JD)
set qn=CreateTrigger()
call TriggerAddAction(qn,function lD)
set Qn=CreateTrigger()
call TriggerAddAction(Qn,function mD)
set sn=CreateTrigger()
call TriggerAddAction(sn,function QD)
set Sn=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(Sn,EVENT_PLAYER_UNIT_ATTACKED)
call TriggerAddCondition(Sn,Condition(function sD))
call TriggerAddAction(Sn,function uD)
set tn=CreateTrigger()
call TriggerAddAction(tn,function wD)
set Tn=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(Tn,EVENT_PLAYER_UNIT_TRAIN_FINISH)
call TriggerAddAction(Tn,function yD)
set un=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(un,EVENT_PLAYER_UNIT_DEATH)
call TriggerAddCondition(un,Condition(function YD))
call TriggerAddAction(un,function zD)
set Un=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(Un,EVENT_PLAYER_UNIT_CONSTRUCT_FINISH)
call TriggerAddAction(Un,function rf)
set wn=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(wn,EVENT_PLAYER_UNIT_CONSTRUCT_START)
call TriggerAddAction(wn,function af)
set Wn=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(Wn,EVENT_PLAYER_UNIT_CONSTRUCT_CANCEL)
call TriggerAddAction(Wn,function nf)
set yn=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(yn,EVENT_PLAYER_UNIT_UPGRADE_FINISH)
call TriggerAddAction(yn,function Vf)
set Yn=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(Yn,EVENT_PLAYER_UNIT_DEATH)
call TriggerAddCondition(Yn,Condition(function Ef))
call TriggerAddAction(Yn,function Xf)
set zn=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(zn,EVENT_PLAYER_UNIT_CONSTRUCT_START)
call TriggerAddCondition(zn,Condition(function Of))
call TriggerAddAction(zn,function Rf)
set Zn=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(Zn,EVENT_PLAYER_UNIT_UPGRADE_START)
call TriggerAddCondition(Zn,Condition(function If))
call TriggerAddAction(Zn,function Af)
set vV=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(vV,EVENT_PLAYER_UNIT_UPGRADE_CANCEL)
call TriggerAddAction(vV,function Nf)
set eV=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(eV,EVENT_PLAYER_UNIT_CHANGE_OWNER)
call TriggerAddCondition(eV,Condition(function bf))
call TriggerAddAction(eV,function Bf)
set xV=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(xV,EVENT_PLAYER_UNIT_SUMMON)
call TriggerAddCondition(xV,Condition(function cf))
call TriggerAddAction(xV,function Cf)
set oV=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(oV,EVENT_PLAYER_UNIT_SUMMON)
call TriggerAddCondition(oV,Condition(function df))
call TriggerAddAction(oV,function Df)
set rV=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(rV,EVENT_PLAYER_UNIT_SUMMON)
call TriggerAddCondition(rV,Condition(function ff))
call TriggerAddAction(rV,function Ff)
set iV=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(iV,EVENT_PLAYER_UNIT_SUMMON)
call TriggerAddCondition(iV,Condition(function gf))
call TriggerAddAction(iV,function Gf)
set aV=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(aV,EVENT_PLAYER_UNIT_SUMMON)
call TriggerAddCondition(aV,Condition(function hf))
call TriggerAddAction(aV,function Hf)
set nV=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(nV,EVENT_PLAYER_UNIT_SPELL_EFFECT)
call TriggerAddCondition(nV,Condition(function jf))
call TriggerAddAction(nV,function Jf)
set VV=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(VV,EVENT_PLAYER_UNIT_SPELL_EFFECT)
call TriggerAddCondition(VV,Condition(function kf))
call TriggerAddAction(VV,function Kf)
set EV=CreateTrigger()
call TriggerRegisterEnterRectSimple(EV,bj_mapInitialPlayableArea)
call TriggerAddAction(EV,function pf)
set XV=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(XV,EVENT_PLAYER_UNIT_ATTACKED)
call TriggerAddCondition(XV,Condition(function Pf))
call TriggerAddAction(XV,function qf)
set OV=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(OV,EVENT_PLAYER_UNIT_ATTACKED)
call TriggerAddCondition(OV,Condition(function Sf))
call TriggerAddAction(OV,function tf)
set RV=CreateTrigger()
call TriggerAddAction(RV,function wf)
set IV=CreateTrigger()
call TriggerRegisterEnterRectSimple(IV,GetCurrentCameraBoundsMapRectBJ())
call TriggerRegisterAnyUnitEventBJ(IV,EVENT_PLAYER_UNIT_UPGRADE_FINISH)
call TriggerAddCondition(IV,Condition(function yf))
call TriggerAddAction(IV,function Yf)
set AV=CreateTrigger()
call TriggerRegisterTimerExpireEvent(AV,Bo)
call TriggerAddAction(AV,function vF)
set NV=CreateTrigger()
call TriggerRegisterTimerEventPeriodic(NV,4.)
call TriggerAddAction(NV,function VF)
set bV=CreateTrigger()
call DisableTrigger(bV)
call TriggerRegisterTimerEventPeriodic(bV,50.)
call TriggerAddAction(bV,function hF)
set BV=CreateTrigger()
call DisableTrigger(BV)
call TriggerRegisterTimerExpireEvent(BV,Na)
call TriggerAddAction(BV,function HF)
set cV=CreateTrigger()
call TriggerRegisterTimerExpireEvent(cV,zx[1])
call TriggerAddAction(cV,function JF)
set CV=CreateTrigger()
call DisableTrigger(CV)
call TriggerRegisterTimerExpireEvent(CV,zx[1])
call TriggerAddAction(CV,function LF)
set dV=CreateTrigger()
call TriggerRegisterTimerExpireEvent(dV,zx[0])
call TriggerAddAction(dV,function mF)
set DV=CreateTrigger()
call DisableTrigger(DV)
call TriggerRegisterTimerExpireEvent(DV,zx[0])
call TriggerAddAction(DV,function MF)
set fV=CreateTrigger()
call DisableTrigger(fV)
call TriggerRegisterTimerExpireEvent(fV,ko)
call TriggerAddAction(fV,function PF)
set FV=CreateTrigger()
call TriggerRegisterTimerEventPeriodic(FV,9.)
call TriggerAddAction(FV,function QF)
set gV=CreateTrigger()
call TriggerRegisterTimerEventPeriodic(gV,3.)
call TriggerAddAction(gV,function SF)
set GV=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(GV,EVENT_PLAYER_UNIT_SPELL_EFFECT)
call TriggerAddCondition(GV,Condition(function tF))
call TriggerAddAction(GV,function TF)
set hV=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(hV,EVENT_PLAYER_UNIT_PICKUP_ITEM)
call TriggerAddCondition(hV,Condition(function uF))
call TriggerAddAction(hV,function UF)
set HV=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(HV,EVENT_PLAYER_UNIT_PICKUP_ITEM)
call TriggerAddCondition(HV,Condition(function wF))
call TriggerAddAction(HV,function WF)
set jV=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(jV,EVENT_PLAYER_UNIT_PICKUP_ITEM)
call TriggerAddCondition(jV,Condition(function yF))
call TriggerAddAction(jV,function YF)
set JV=CreateTrigger()
call TriggerAddAction(JV,function vg)
set kV=CreateTrigger()
call TriggerAddAction(kV,function og)
set KV=CreateTrigger()
call TriggerAddAction(KV,function ig)
set lV=CreateTrigger()
call TriggerAddAction(lV,function ng)
set LV=CreateTrigger()
call TriggerAddAction(LV,function Eg)
set mV=CreateTrigger()
call TriggerAddAction(mV,function Og)
set MV=CreateTrigger()
call TriggerAddAction(MV,function Ig)
set pV=CreateTrigger()
call TriggerAddAction(pV,function Ng)
set PV=CreateTrigger()
call TriggerAddAction(PV,function Bg)
set qV=CreateTrigger()
call TriggerAddAction(qV,function Cg)
set QV=CreateTrigger()
call TriggerAddAction(QV,function Dg)
set sV=CreateTrigger()
call TriggerAddAction(sV,function Fg)
set SV=CreateTrigger()
call TriggerAddAction(SV,function Gg)
set tV=CreateTrigger()
call TriggerAddAction(tV,function Hg)
set TV=CreateTrigger()
call TriggerAddAction(TV,function Jg)
set uV=CreateTrigger()
call TriggerAddAction(uV,function Kg)
set UV=CreateTrigger()
call TriggerAddAction(UV,function Lg)
set wV=CreateTrigger()
call TriggerAddAction(wV,function Mg)
set WV=CreateTrigger()
call TriggerAddAction(WV,function pg)
set yV=CreateTrigger()
call TriggerAddAction(yV,function qg)
set YV=CreateTrigger()
call TriggerAddAction(YV,function sg)
set zV=CreateTrigger()
call TriggerAddAction(zV,function tg)
set ZV=CreateTrigger()
call TriggerAddAction(ZV,function ug)
set vE=CreateTrigger()
call DisableTrigger(vE)
call TriggerRegisterPlayerChatEvent(vE,Player(0),"-agree",true)
call TriggerRegisterPlayerChatEvent(vE,Player(1),"-agree",true)
call TriggerRegisterPlayerChatEvent(vE,Player(2),"-agree",true)
call TriggerRegisterPlayerChatEvent(vE,Player(3),"-agree",true)
call TriggerRegisterPlayerChatEvent(vE,Player(4),"-agree",true)
call TriggerRegisterPlayerChatEvent(vE,Player(5),"-agree",true)
call TriggerRegisterPlayerChatEvent(vE,Player(6),"-agree",true)
call TriggerRegisterPlayerChatEvent(vE,Player(7),"-agree",true)
call TriggerRegisterPlayerChatEvent(vE,Player(8),"-agree",true)
call TriggerRegisterPlayerChatEvent(vE,Player(9),"-agree",true)
call TriggerRegisterPlayerChatEvent(vE,Player(10),"-agree",true)
call TriggerRegisterPlayerChatEvent(vE,Player(11),"-agree",true)
call TriggerAddAction(vE,function Ug)
set eE=CreateTrigger()
call TriggerRegisterPlayerChatEvent(eE,Player(0),"-income",true)
call TriggerRegisterPlayerChatEvent(eE,Player(1),"-income",true)
call TriggerRegisterPlayerChatEvent(eE,Player(2),"-income",true)
call TriggerRegisterPlayerChatEvent(eE,Player(3),"-income",true)
call TriggerRegisterPlayerChatEvent(eE,Player(4),"-income",true)
call TriggerRegisterPlayerChatEvent(eE,Player(5),"-income",true)
call TriggerRegisterPlayerChatEvent(eE,Player(6),"-income",true)
call TriggerRegisterPlayerChatEvent(eE,Player(7),"-income",true)
call TriggerRegisterPlayerChatEvent(eE,Player(8),"-income",true)
call TriggerRegisterPlayerChatEvent(eE,Player(9),"-income",true)
call TriggerRegisterPlayerChatEvent(eE,Player(10),"-income",true)
call TriggerRegisterPlayerChatEvent(eE,Player(11),"-income",true)
call TriggerAddAction(eE,function wg)
set xE=CreateTrigger()
call DisableTrigger(xE)
call TriggerRegisterPlayerChatEvent(xE,Player(0),"-draw",true)
call TriggerRegisterPlayerChatEvent(xE,Player(1),"-draw",true)
call TriggerRegisterPlayerChatEvent(xE,Player(2),"-draw",true)
call TriggerRegisterPlayerChatEvent(xE,Player(3),"-draw",true)
call TriggerRegisterPlayerChatEvent(xE,Player(4),"-draw",true)
call TriggerRegisterPlayerChatEvent(xE,Player(5),"-draw",true)
call TriggerRegisterPlayerChatEvent(xE,Player(6),"-draw",true)
call TriggerRegisterPlayerChatEvent(xE,Player(7),"-draw",true)
call TriggerRegisterPlayerChatEvent(xE,Player(8),"-draw",true)
call TriggerRegisterPlayerChatEvent(xE,Player(9),"-draw",true)
call TriggerRegisterPlayerChatEvent(xE,Player(10),"-draw",true)
call TriggerRegisterPlayerChatEvent(xE,Player(11),"-draw",true)
call TriggerAddAction(xE,function Wg)
set oE=CreateTrigger()
call TriggerRegisterPlayerChatEvent(oE,Player(0),"-armor",true)
call TriggerRegisterPlayerChatEvent(oE,Player(1),"-armor",true)
call TriggerRegisterPlayerChatEvent(oE,Player(2),"-armor",true)
call TriggerRegisterPlayerChatEvent(oE,Player(3),"-armor",true)
call TriggerRegisterPlayerChatEvent(oE,Player(4),"-armor",true)
call TriggerRegisterPlayerChatEvent(oE,Player(5),"-armor",true)
call TriggerRegisterPlayerChatEvent(oE,Player(6),"-armor",true)
call TriggerRegisterPlayerChatEvent(oE,Player(7),"-armor",true)
call TriggerRegisterPlayerChatEvent(oE,Player(8),"-armor",true)
call TriggerRegisterPlayerChatEvent(oE,Player(9),"-armor",true)
call TriggerRegisterPlayerChatEvent(oE,Player(10),"-armor",true)
call TriggerRegisterPlayerChatEvent(oE,Player(11),"-armor",true)
call TriggerAddAction(oE,function yg)
set rE=CreateTrigger()
call TriggerRegisterPlayerChatEvent(rE,Player(0),"-stats",true)
call TriggerRegisterPlayerChatEvent(rE,Player(1),"-stats",true)
call TriggerRegisterPlayerChatEvent(rE,Player(2),"-stats",true)
call TriggerRegisterPlayerChatEvent(rE,Player(3),"-stats",true)
call TriggerRegisterPlayerChatEvent(rE,Player(4),"-stats",true)
call TriggerRegisterPlayerChatEvent(rE,Player(5),"-stats",true)
call TriggerRegisterPlayerChatEvent(rE,Player(6),"-stats",true)
call TriggerRegisterPlayerChatEvent(rE,Player(7),"-stats",true)
call TriggerRegisterPlayerChatEvent(rE,Player(8),"-stats",true)
call TriggerRegisterPlayerChatEvent(rE,Player(9),"-stats",true)
call TriggerRegisterPlayerChatEvent(rE,Player(10),"-stats",true)
call TriggerRegisterPlayerChatEvent(rE,Player(11),"-stats",true)
call TriggerAddAction(rE,function Yg)
set iE=CreateTrigger()
call TriggerRegisterAnyUnitEventBJ(iE,EVENT_PLAYER_UNIT_PICKUP_ITEM)
call TriggerAddAction(iE,function oG)
set aE=CreateTrigger()
call TriggerAddAction(aE,function BG)
set nE=CreateTrigger()
call DisableTrigger(nE)
call TriggerRegisterTimerEventPeriodic(nE,2.)
call TriggerAddAction(nE,function CG)
set VE=CreateTrigger()
call TriggerRegisterTimerEventPeriodic(VE,15.)
call TriggerAddAction(VE,function FG)
set EE=CreateTrigger()
call TriggerAddAction(EE,function gG)
set XE=CreateTrigger()
call TriggerRegisterPlayerSelectionEventBJ(XE,Player(0),true)
call TriggerRegisterPlayerSelectionEventBJ(XE,Player(1),true)
call TriggerRegisterPlayerSelectionEventBJ(XE,Player(2),true)
call TriggerRegisterPlayerSelectionEventBJ(XE,Player(3),true)
call TriggerRegisterPlayerSelectionEventBJ(XE,Player(4),true)
call TriggerRegisterPlayerSelectionEventBJ(XE,Player(5),true)
call TriggerRegisterPlayerSelectionEventBJ(XE,Player(6),true)
call TriggerRegisterPlayerSelectionEventBJ(XE,Player(7),true)
call TriggerRegisterPlayerSelectionEventBJ(XE,Player(8),true)
call TriggerRegisterPlayerSelectionEventBJ(XE,Player(9),true)
call TriggerRegisterPlayerSelectionEventBJ(XE,Player(10),true)
call TriggerRegisterPlayerSelectionEventBJ(XE,Player(11),true)
call TriggerAddAction(XE,function GG)
set OE=CreateTrigger()
call TriggerRegisterPlayerChatEvent(OE,Player(0),"-afk",true)
call TriggerRegisterPlayerChatEvent(OE,Player(1),"-afk",true)
call TriggerRegisterPlayerChatEvent(OE,Player(2),"-afk",true)
call TriggerRegisterPlayerChatEvent(OE,Player(3),"-afk",true)
call TriggerRegisterPlayerChatEvent(OE,Player(4),"-afk",true)
call TriggerRegisterPlayerChatEvent(OE,Player(5),"-afk",true)
call TriggerRegisterPlayerChatEvent(OE,Player(6),"-afk",true)
call TriggerRegisterPlayerChatEvent(OE,Player(7),"-afk",true)
call TriggerRegisterPlayerChatEvent(OE,Player(8),"-afk",true)
call TriggerRegisterPlayerChatEvent(OE,Player(9),"-afk",true)
call TriggerRegisterPlayerChatEvent(OE,Player(10),"-afk",true)
call TriggerRegisterPlayerChatEvent(OE,Player(11),"-afk",true)
call TriggerAddAction(OE,function HG)
set RE=CreateTrigger()
call TriggerRegisterPlayerChatEvent(RE,Player(0),"-re",true)
call TriggerRegisterPlayerChatEvent(RE,Player(1),"-re",true)
call TriggerRegisterPlayerChatEvent(RE,Player(2),"-re",true)
call TriggerRegisterPlayerChatEvent(RE,Player(3),"-re",true)
call TriggerRegisterPlayerChatEvent(RE,Player(4),"-re",true)
call TriggerRegisterPlayerChatEvent(RE,Player(5),"-re",true)
call TriggerRegisterPlayerChatEvent(RE,Player(6),"-re",true)
call TriggerRegisterPlayerChatEvent(RE,Player(7),"-re",true)
call TriggerRegisterPlayerChatEvent(RE,Player(8),"-re",true)
call TriggerRegisterPlayerChatEvent(RE,Player(9),"-re",true)
call TriggerRegisterPlayerChatEvent(RE,Player(10),"-re",true)
call TriggerRegisterPlayerChatEvent(RE,Player(11),"-re",true)
call TriggerAddAction(RE,function JG)
set IE=CreateTrigger()
call DisableTrigger(IE)
call TriggerRegisterPlayerEventLeave(IE,Player(0))
call TriggerRegisterPlayerEventLeave(IE,Player(1))
call TriggerRegisterPlayerEventLeave(IE,Player(2))
call TriggerRegisterPlayerEventLeave(IE,Player(3))
call TriggerRegisterPlayerEventLeave(IE,Player(4))
call TriggerRegisterPlayerEventLeave(IE,Player(5))
call TriggerRegisterPlayerEventLeave(IE,Player(6))
call TriggerRegisterPlayerEventLeave(IE,Player(7))
call TriggerRegisterPlayerEventLeave(IE,Player(8))
call TriggerRegisterPlayerEventLeave(IE,Player(9))
call TriggerRegisterPlayerEventLeave(IE,Player(10))
call TriggerRegisterPlayerEventLeave(IE,Player(11))
call InitTrig_kick_2()
call InitTrig_kick_3()
call InitTrig_kick_4()
call InitTrig_kick_5()
call InitTrig_kick_7()
call InitTrig_kick_8()
call InitTrig_kick_9()
call InitTrig_kick_10()
call InitTrig_kick_11()






call TriggerAddAction(IE,function kG)
set AE=CreateTrigger()
call DisableTrigger(AE)
call TriggerRegisterAnyUnitEventBJ(AE,EVENT_PLAYER_UNIT_ATTACKED)
call TriggerAddCondition(AE,Condition(function KG))
call TriggerAddAction(AE,function SG)
set NE=CreateTrigger()
call TriggerRegisterPlayerChatEvent(NE,Player(0),"-aidebug3",true)
call TriggerAddAction(NE,function tG)
set bE=CreateTrigger()
call TriggerRegisterPlayerChatEvent(bE,Player(0),"-aidebugoff",true)
call TriggerAddAction(bE,function TG)
set BE=CreateTrigger()
call TriggerRegisterPlayerChatEvent(BE,Player(0),"-aidebugon",true)
call TriggerAddAction(BE,function uG)
set cE=CreateTrigger()
call TriggerAddAction(cE,function UG)
set CE=CreateTrigger()
call TriggerAddAction(CE,function wG)
set dE=CreateTrigger()
call TriggerAddAction(dE,function WG)
set DE=CreateTrigger()
call TriggerRegisterTimerExpireEvent(DE,Oa)
call TriggerAddAction(DE,function YG)
call ConditionalTriggerExecute(Vn)
call ConditionalTriggerExecute(NV)
call CF_Init()
endfunction
function config takes nothing returns nothing
call SetMapName("|cffFFD700Castle Fight|r v1.15b")
call SetMapDescription("An epic battle between the two castles!

Recommended gamemode is 4on4 with 2 wins.

hf!")
call SetPlayers(10)
call SetTeams(10)
call SetGamePlacement(MAP_PLACEMENT_TEAMS_TOGETHER)
call DefineStartLocation(0,-4288.,-64.)
call DefineStartLocation(1,-4288.,320.)
call DefineStartLocation(2,-4288.,64.)
call DefineStartLocation(3,-4288.,-320.)
call DefineStartLocation(4,-4288.,192.)
call DefineStartLocation(5,4288.,-64.)
call DefineStartLocation(6,4288.,-320.)
call DefineStartLocation(7,4288.,64.)
call DefineStartLocation(8,4288.,-192.)
call DefineStartLocation(9,4288.,320.)
call SetPlayerStartLocation(Player(0),0)
call ForcePlayerStartLocation(Player(0),0)
call SetPlayerColor(Player(0),ConvertPlayerColor(0))
call SetPlayerRacePreference(Player(0),RACE_PREF_NIGHTELF)
call SetPlayerRaceSelectable(Player(0),false)
call SetPlayerController(Player(0),MAP_CONTROL_USER)
call SetPlayerStartLocation(Player(1),1)
call ForcePlayerStartLocation(Player(1),1)
call SetPlayerColor(Player(1),ConvertPlayerColor(1))
call SetPlayerRacePreference(Player(1),RACE_PREF_NIGHTELF)
call SetPlayerRaceSelectable(Player(1),false)
call SetPlayerController(Player(1),MAP_CONTROL_USER)
call SetPlayerStartLocation(Player(2),2)
call ForcePlayerStartLocation(Player(2),2)
call SetPlayerColor(Player(2),ConvertPlayerColor(2))
call SetPlayerRacePreference(Player(2),RACE_PREF_NIGHTELF)
call SetPlayerRaceSelectable(Player(2),false)
call SetPlayerController(Player(2),MAP_CONTROL_USER)
call SetPlayerStartLocation(Player(3),3)
call ForcePlayerStartLocation(Player(3),3)
call SetPlayerColor(Player(3),ConvertPlayerColor(3))
call SetPlayerRacePreference(Player(3),RACE_PREF_NIGHTELF)
call SetPlayerRaceSelectable(Player(3),false)
call SetPlayerController(Player(3),MAP_CONTROL_USER)
call SetPlayerStartLocation(Player(4),4)
call ForcePlayerStartLocation(Player(4),4)
call SetPlayerColor(Player(4),ConvertPlayerColor(4))
call SetPlayerRacePreference(Player(4),RACE_PREF_NIGHTELF)
call SetPlayerRaceSelectable(Player(4),false)
call SetPlayerController(Player(4),MAP_CONTROL_USER)
call SetPlayerStartLocation(Player(6),5)
call ForcePlayerStartLocation(Player(6),5)
call SetPlayerColor(Player(6),ConvertPlayerColor(6))
call SetPlayerRacePreference(Player(6),RACE_PREF_UNDEAD)
call SetPlayerRaceSelectable(Player(6),false)
call SetPlayerController(Player(6),MAP_CONTROL_USER)
call SetPlayerStartLocation(Player(7),6)
call ForcePlayerStartLocation(Player(7),6)
call SetPlayerColor(Player(7),ConvertPlayerColor(7))
call SetPlayerRacePreference(Player(7),RACE_PREF_UNDEAD)
call SetPlayerRaceSelectable(Player(7),false)
call SetPlayerController(Player(7),MAP_CONTROL_USER)
call SetPlayerStartLocation(Player(8),7)
call ForcePlayerStartLocation(Player(8),7)
call SetPlayerColor(Player(8),ConvertPlayerColor(8))
call SetPlayerRacePreference(Player(8),RACE_PREF_UNDEAD)
call SetPlayerRaceSelectable(Player(8),false)
call SetPlayerController(Player(8),MAP_CONTROL_USER)
call SetPlayerStartLocation(Player(9),8)
call ForcePlayerStartLocation(Player(9),8)
call SetPlayerColor(Player(9),ConvertPlayerColor(9))
call SetPlayerRacePreference(Player(9),RACE_PREF_UNDEAD)
call SetPlayerRaceSelectable(Player(9),false)
call SetPlayerController(Player(9),MAP_CONTROL_USER)
call SetPlayerStartLocation(Player(10),9)
call ForcePlayerStartLocation(Player(10),9)
call SetPlayerColor(Player(10),ConvertPlayerColor(10))
call SetPlayerRacePreference(Player(10),RACE_PREF_UNDEAD)
call SetPlayerRaceSelectable(Player(10),false)
call SetPlayerController(Player(10),MAP_CONTROL_USER)
call InitCustomTeams()
call SetStartLocPrioCount(0,1)
call SetStartLocPrio(0,0,2,MAP_LOC_PRIO_HIGH)
call SetStartLocPrioCount(1,1)
call SetStartLocPrio(1,0,4,MAP_LOC_PRIO_HIGH)
call SetStartLocPrioCount(2,2)
call SetStartLocPrio(2,0,0,MAP_LOC_PRIO_HIGH)
call SetStartLocPrio(2,1,4,MAP_LOC_PRIO_HIGH)
call SetStartLocPrioCount(3,2)
call SetStartLocPrio(3,0,0,MAP_LOC_PRIO_HIGH)
call SetStartLocPrio(3,1,2,MAP_LOC_PRIO_LOW)
call SetStartLocPrioCount(4,2)
call SetStartLocPrio(4,0,1,MAP_LOC_PRIO_HIGH)
call SetStartLocPrio(4,1,2,MAP_LOC_PRIO_HIGH)
call SetStartLocPrioCount(5,2)
call SetStartLocPrio(5,0,7,MAP_LOC_PRIO_HIGH)
call SetStartLocPrio(5,1,8,MAP_LOC_PRIO_HIGH)
call SetStartLocPrioCount(6,1)
call SetStartLocPrio(6,0,8,MAP_LOC_PRIO_HIGH)
call SetStartLocPrioCount(7,1)
call SetStartLocPrio(7,0,5,MAP_LOC_PRIO_HIGH)
call SetStartLocPrioCount(8,2)
call SetStartLocPrio(8,0,5,MAP_LOC_PRIO_HIGH)
call SetStartLocPrio(8,1,6,MAP_LOC_PRIO_HIGH)
call SetStartLocPrioCount(9,2)
call SetStartLocPrio(9,0,5,MAP_LOC_PRIO_LOW)
call SetStartLocPrio(9,1,7,MAP_LOC_PRIO_HIGH)
endfunction
function xh takes nothing returns boolean
local unit u=(nA(xO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]))
if(u==null)then
return true
endif
if GetUnitAbilityLevel(u,'A09L')>0 then
set u=(nA(xO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]))
if(u==null)then
return true
endif
endif
if GetUnitAbilityLevel(u,'A09L')==0 then
call UnitAddAbility(u,'A09L')
endif
set u=GetSpellAbilityUnit()
call SetUnitAnimation(u,"death")
call TriggerSleepAction(.3)
call SetUnitAnimation(u,"stand")
return true
endfunction
function oh takes nothing returns boolean
local unit u=(nA(xO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]))
if(u==null)then
return true
endif
if GetUnitAbilityLevel(u,'A09L')>0 then
set u=(nA(xO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]))
if(u==null)then
return true
endif
endif
if GetUnitAbilityLevel(u,'A09L')<=1 then
call UnitAddAbility(u,'A09L')
call SetUnitAbilityLevel(u,'A09L',2)
endif
set u=GetSpellAbilityUnit()
call SetUnitAnimation(u,"death")
call TriggerSleepAction(.3)
call SetUnitAnimation(u,"stand")
return true
endfunction
function rh takes nothing returns boolean
local real Qf=ei[GetUnitPointValue(GetSpellAbilityUnit())]
local integer i=0
local integer OI=20+R2I((Qf-500)/ 50)
local real x
local real y
local real sf
local effect array e
loop
exitwhen i>=OI
set sf=2*bj_PI*i/ OI
set y=Sin(sf)*Qf+GetUnitY(GetTriggerUnit())
set x=Cos(sf)*Qf+GetUnitX(GetTriggerUnit())
if(Fi[GetPlayerId(GetOwningPlayer((GetTriggerUnit())))+1])==Fi[(1+GetPlayerId(GetLocalPlayer()))]then
set e[i]=AddSpecialEffect("Abilities\\Spells\\NightElf\\Barkskin\\BarkSkinTarget.mdl",x,y)
else
set e[i]=AddSpecialEffect(".mdl",x,y)
endif
set i=i+1
endloop
call TriggerSleepAction(6)
set i=0
loop
exitwhen i>=OI
call DestroyEffect(e[i])
set e[i]=null
set i=i+1
endloop
return true
endfunction
function ih takes nothing returns boolean
local unit rN=(nA(xO[((Fi[GetPlayerId(GetOwningPlayer(((GetTriggerUnit()))))+1]))]))
call XB("Abilities\\Spells\\Human\\Polymorph\\PolyMorphTarget.mdl",GetTriggerUnit())
if(rN==null)then
return true
endif
if GetUnitAbilityLevel(rN,'A08C')==1 then
set rN=(nA(xO[((Fi[GetPlayerId(GetOwningPlayer(((GetTriggerUnit()))))+1]))]))
if(rN==null)then
return true
endif
endif
call IB("Abilities\\Spells\\Human\\ControlMagic\\ControlMagicTarget.mdl",rN,"overhead")
call UnitAddAbility(rN,'A08C')
call UnitAddAbility(rN,'A08D')
call UnitAddAbility(rN,'A08F')
return true
endfunction
function ah takes nothing returns boolean
local integer yI=(Fi[GetPlayerId(GetOwningPlayer((GetTriggerUnit())))+1])
call XB("Abilities\\Spells\\Items\\TomeOfRetraining\\TomeOfRetrainingCaster.mdl",GetTriggerUnit())
call EnableTrigger(OV)
set cr[yI]=cr[yI]+1
return true
endfunction
function nh takes nothing returns boolean
local unit rN=(nA(xO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
local effect e
local fogmodifier f
local boolean b=gE
if rN==null then
return true
endif
set e=AddSpecialEffect("Abilities\\Spells\\NightElf\\Starfall\\StarfallCaster.mdl",GetUnitX(GetSpellAbilityUnit()),GetUnitY(GetSpellAbilityUnit()))
if b then
set f=CreateFogModifierRadius(GetOwningPlayer(GetSpellAbilityUnit()),FOG_OF_WAR_VISIBLE,GetUnitX(rN),GetUnitY(rN),1100.,true,false)
call FogModifierStart(f)
endif
if Kr then
call oN(mv,GetSpellAbilityUnit(),rN)
else
call oN(Lv,GetSpellAbilityUnit(),rN)
endif
call TriggerSleepAction(8)
if b then
call DestroyFogModifier(f)
set f=null
endif
call DestroyEffect(e)
set e=null
return true
endfunction
function Vh takes nothing returns boolean
local location uf=GetUnitLoc(GetTriggerUnit())
local location rN=GetRandomLocInRect(Mx[Fi[(1+GetPlayerId(GetOwningPlayer(GetTriggerUnit())))]])
local real nR=AngleBetweenPoints(uf,rN)
local location l=rR(rN,-2500,nR)
local unit Uf
local timer t=CreateTimer()
local integer s=GetHandleId(t)
local effect e
local unit u
call PlaySoundBJ(in)
call PlaySoundBJ(nn)
set u=CreateUnitAtLoc(GetTriggerPlayer(),'h06X',uf,270)
call SetUnitTimeScalePercent(u,20)
set e=AddSpecialEffectLoc("Abilities\\Spells\\Other\\Levelup\\LevelupCaster.mdl",uf)
call DestroyEffect(e)
set e=null
call TriggerSleepAction(5)
set Uf=CreateUnitAtLoc(GetTriggerPlayer(),'h06V',l,nR)
call SaveInteger(JE,s,0,250)
call SaveUnitHandle(JE,s,1,Uf)
call SetUnitFlyHeight(Uf,1500.,.0)
call TimerStart(t,.04,true,function Tf)
call RemoveLocation(l)
set l=null
call RemoveLocation(uf)
set uf=null
set t=null
call RemoveLocation(rN)
set rN=null
call RemoveUnit(u)
return true
endfunction
function Eh takes nothing returns boolean
local unit u=(nA(iO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
local integer i=0
if u==null then
return true
endif
loop
exitwhen i>5
set do=GetUnitX(u)+64.*Cos(60.*I2R(i)*bj_DEGTORAD)
set Co=GetUnitY(u)+64.*Sin(60.*I2R(i)*bj_DEGTORAD)
if Kr then
set bj_lastCreatedUnit=CreateUnit(GetOwningPlayer(GetSpellAbilityUnit()),'n021',do,Co,AngleBetweenPoints(sx,Px))
else
set bj_lastCreatedUnit=CreateUnit(GetOwningPlayer(GetSpellAbilityUnit()),'n01C',do,Co,AngleBetweenPoints(sx,Px))
endif
call UnitApplyTimedLife(bj_lastCreatedUnit,'BTLF',9.)
set i=i+1
endloop
return true
endfunction
function Xh takes nothing returns boolean
local unit u=(nA(xO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
if(u==null)then
return true
endif
call IB("Abilities\\Spells\\Undead\\DeathPact\\DeathPactTarget.mdl",u,"origin")
if HB(u,GetSpellAbilityUnit())then
call UnitDamageTargetBJ(GetSpellAbilityUnit(),u,200.,ATTACK_TYPE_NORMAL,DAMAGE_TYPE_SONIC)
endif
return true
endfunction
function Oh takes nothing returns boolean
call RN(iv,GetSpellAbilityUnit())
return true
endfunction
function Rh takes nothing returns boolean
local unit u
local effect e=null
local location l=null
set u=(nA(xO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
if u==null then
return true
endif
if HB(u,GetSpellAbilityUnit())then
call UnitDamageTargetBJ(GetSpellAbilityUnit(),u,50000.,ATTACK_TYPE_NORMAL,DAMAGE_TYPE_DEATH)
endif
call XB("Abilities\\Spells\\Undead\\DeathCoil\\DeathCoilSpecialArt.mdl",u)
set u=GetSpellAbilityUnit()
call SetUnitAnimation(u,"work")
call TriggerSleepAction(1.)
call ResetUnitAnimation(u)
return true
endfunction
function Ih takes nothing returns boolean
local integer i=GetRandomInt(0,8)
local unit u=(nA(xO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
call XB("Abilities\\Spells\\Orc\\FeralSpirit\\feralspiritdone.mdl",GetSpellAbilityUnit())
if u==null then
return true
endif
call IB("Abilities\\Spells\\Orc\\FeralSpirit\\feralspiritdone.mdl",u,"origin")
if not HB(u,GetSpellAbilityUnit())then
return true
endif
if i==0 then
call XB("Abilities\\Spells\\Orc\\FeralSpirit\\feralspiritdone.mdl",u)
call ExplodeUnitBJ(u)
set i=(1+GetPlayerId(GetOwningPlayer(GetSpellAbilityUnit())))
set Cr[i]=Cr[i]+1
set Ra[Fi[i]]=Ra[Fi[i]]+1
elseif i==1 then
call UnitDamageTargetBJ(GetSpellAbilityUnit(),u,50000.,ATTACK_TYPE_NORMAL,DAMAGE_TYPE_DEATH)
elseif i==2 then
call UnitDamageTargetBJ(GetSpellAbilityUnit(),u,500.,ATTACK_TYPE_NORMAL,DAMAGE_TYPE_DEATH)
elseif i==3 then
call IB("Abilities\\Spells\\Human\\Avatar\\AvatarCaster.mdl",u,"origin")
call UnitAddAbility(u,'A06T')
call UnitAddAbility(u,'A06U')
call SetUnitLifePercentBJ(u,'d')
elseif i==4 then
call aN(Dv,GetSpellAbilityUnit(),u)
call TriggerSleepAction(1.)
call pA(u)
if GetUnitTypeId(u)=='h03A' then
call TriggerSleepAction(44.5)
call IssueImmediateOrderById(u,852055)
call TriggerSleepAction(.5)
call pA(u)
return true
endif
elseif i==5 then
call nN(fv,GetSpellAbilityUnit(),u)
elseif i==6 then
call XB("Abilities\\Spells\\Orc\\FeralSpirit\\feralspiritdone.mdl",u)
call LB(u)
call ShowUnit(u,false)
call Ac('n01S',u,GetSpellAbilityUnit(),GetTriggerPlayer())
call RemoveUnit(u)
return true
endif
return true
endfunction
function Ah takes nothing returns boolean
local location l=GetUnitLoc(GetSpellAbilityUnit())
local group g=AR(500.,l)
call XB("Abilities\\Spells\\Other\\HowlOfTerror\\HowlCaster.mdl",GetSpellAbilityUnit())
set av=GetSpellAbilityUnit()
call ForGroupBJ(g,function zf)
call DestroyGroup(g)
call RemoveLocation(l)
set g=null
set l=null
return true
endfunction
function Nh takes nothing returns boolean
local unit u=(nA(xO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
if u==null or not HB(u,GetSpellAbilityUnit())then
return true
endif
call nN(W,GetSpellAbilityUnit(),u)
return true
endfunction
function bh takes nothing returns boolean
local unit u=(nA(rO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
if(u==null)or not HB(u,GetSpellAbilityUnit())then
return true
endif
call aN(kv,GetSpellAbilityUnit(),u)
return true
endfunction
function Bh takes nothing returns boolean
local unit u=(nA(xO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]))
if(u==null)then
return true
endif
call UnitAddAbility(u,'A03B')
call UnitAddAbility(u,'A03A')
call UnitAddAbility(u,'A03D')
call UnitAddAbility(u,'A08L')
set Mi=GetRandomInt(1,3)
if(Mi==1)then
call UnitAddAbility(u,'A05I')
call UnitAddAbility(u,'A06W')
else
if(Mi==2)then
call UnitAddAbility(u,'A08M')
call UnitAddAbility(u,'A06Y')
else
call UnitAddAbility(u,'A08R')
call UnitAddAbility(u,'A06X')
endif
endif
call IB("Abilities\\Spells\\Undead\\ReplenishHealth\\ReplenishHealthCasterOverhead.mdl",u,"overhead")
call XB("Abilities\\Spells\\Human\\DispelMagic\\DispelMagicTarget.mdl",GetSpellAbilityUnit())
return true
endfunction
function ch takes nothing returns boolean
local unit u=(nA(xO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
call aN(Jv,GetSpellAbilityUnit(),u)
set u=GetSpellAbilityUnit()
call TriggerSleepAction(.5)
call SetUnitAnimation(u,"attack")
call TriggerSleepAction(1.)
call ResetUnitAnimation(u)
return true
endfunction
function Ch takes nothing returns boolean
local unit u
local unit u2
local real Zf
local integer i=0
local player p=GetOwningPlayer(GetSpellAbilityUnit())
local real x=GetUnitX(GetSpellAbilityUnit())
local real y=GetUnitY(GetSpellAbilityUnit())
set u=GetSpellAbilityUnit()
call SetUnitAnimation(u,"death")
call TriggerSleepAction(1.5)
call TimerStart(Bo,.04,true,null)
set Zf=I2R(Fi[(1+GetPlayerId(p))])*180
loop
exitwhen i>2
set u2=CreateUnit(p,'h08U',x,y,ModuloReal(Zf+GetRandomReal(-55,55)+360,360))
if(Kr)then
call UnitRemoveAbility(u2,'A080')
call UnitAddAbility(u2,'A084')
endif
call GroupAddUnit(tx,u2)
set i=i+1
endloop
call EnableWeatherEffect(kx,true)
call TriggerSleepAction(3.7)
call ResetUnitAnimation(u)
call TriggerSleepAction(2.6)
call EnableWeatherEffect(kx,false)
return true
endfunction
function dh takes nothing returns boolean
local integer i
local unit u
local integer rl
call IB("Abilities\\Spells\\Items\\TomeOfRetraining\\TomeOfRetrainingCaster.mdl",GetSpellAbilityUnit(),"origin")
set fa=GetUnitTypeId((nA(xO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])])))
set i=GetUnitPointValueByType(fa)
set rl=xO[(Fi[GetPlayerId(GetOwningPlayer((GetSpellAbilityUnit())))+1])]
call OA(rl)
if i>'d' then
loop
set u=RA(rl)
exitwhen u==null
if GetUnitPointValue(u)==i then
call IB("Abilities\\Spells\\Items\\AIil\\AIilTarget.mdl",u,"origin")
call nN(rv,GetSpellAbilityUnit(),u)
endif
endloop
else
loop
set u=RA(rl)
exitwhen u==null
if GetUnitTypeId(u)==fa then
call IB("Abilities\\Spells\\Items\\AIil\\AIilTarget.mdl",u,"origin")
call nN(rv,GetSpellAbilityUnit(),u)
endif
endloop
endif
return true
endfunction
function Dh takes nothing returns boolean
local unit u=GetSpellAbilityUnit()
call xN(Mv,u)
call TriggerSleepAction(1.)
call ResetUnitAnimation(u)
return true
endfunction
function fh takes nothing returns boolean
local unit u=(nA(xO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
if(u==null)or not HB(u,GetSpellAbilityUnit())then
return true
endif
call nN(Cv,GetSpellAbilityUnit(),u)
call TriggerSleepAction(1.)
call pA(u)
if GetUnitTypeId(u)=='h03A' then
call TriggerSleepAction(44.5)
call IssueImmediateOrderById(u,852055)
call TriggerSleepAction(.5)
call pA(u)
endif
return true
endfunction
function Fh takes nothing returns boolean
local unit u=(nA(iO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
local integer i
if Kr then
call VN(qv,GetSpellAbilityUnit(),u)
else
call VN(Pv,GetSpellAbilityUnit(),u)
endif
return true
endfunction
function gh takes nothing returns boolean
local unit u=(nA(iO[(aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))])]))
call oN(Gv,GetSpellAbilityUnit(),u)
return true
endfunction
function Gh takes nothing returns boolean
local unit u=(nA(oO[aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]]))
local integer i=0
loop
exitwhen((GetUnitAbilityLevel((u),'A06V')>0)==false)
set u=(nA(oO[aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]]))
set i=i+1
if(i>=10)then
return true
exitwhen true
endif
endloop
if(u==null)then
return true
endif
call XB("Abilities\\Spells\\Human\\MarkOfChaos\\MarkOfChaosTarget.mdl",u)
set i=Fi[(1+GetPlayerId(GetOwningPlayer(GetSpellAbilityUnit())))]
set Gi[i]=(Gi[i]+1)
call MultiboardSetItemValueBJ(ar,4,Xa[i],I2S(Gi[i]))
call KillUnit(u)
return true
endfunction
function hh takes nothing returns boolean
local unit u=(nA(oO[aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]]))
local fogmodifier f
call XB("Objects\\Spawnmodels\\Naga\\NagaDeath\\NagaDeath.mdl",GetSpellAbilityUnit())
if u==null then
return true
endif
call cN('h04G',GetSpellAbilityUnit(),GetSpellAbilityUnit(),20.)
if gE then
set f=CreateFogModifierRadius(GetOwningPlayer(GetSpellAbilityUnit()),FOG_OF_WAR_VISIBLE,GetUnitX(u),GetUnitY(u),128.,true,false)
call FogModifierStart(f)
call IssueTargetOrderById(bj_lastCreatedUnit,851985,u)
call TriggerSleepAction(.1)
call DestroyFogModifier(f)
set f=null
else
call IssueTargetOrderById(bj_lastCreatedUnit,851985,u)
endif
return true
endfunction
function Hh takes nothing returns boolean
local unit u=(nA(oO[aO[((Fi[GetPlayerId(GetOwningPlayer(((GetSpellAbilityUnit()))))+1]))]]))
local fogmodifier f
call XB("Objects\\Spawnmodels\\Naga\\NagaDeath\\NagaDeath.mdl",GetSpellAbilityUnit())
if u==null then
return true
endif
call cN('h04H',GetSpellAbilityUnit(),GetSpellAbilityUnit(),20.)
if gE then
set f=CreateFogModifierRadius(GetOwningPlayer(GetSpellAbilityUnit()),FOG_OF_WAR_VISIBLE,GetUnitX(u),GetUnitY(u),128.,true,false)
call FogModifierStart(f)
call IssueTargetOrderById(bj_lastCreatedUnit,851985,u)
call TriggerSleepAction(.1)
call DestroyFogModifier(f)
set f=null
else
call IssueTargetOrderById(bj_lastCreatedUnit,851985,u)
endif
return true
endfunction
function jh takes nothing returns boolean
local location l1=GetUnitLoc(GetTriggerUnit())
local location l2
local integer i=0
local real nR=bj_RADTODEG*Atan2(GetUnitY(GetSpellTargetUnit())-GetUnitY(GetTriggerUnit()),GetUnitX(GetSpellTargetUnit())-GetUnitX(GetTriggerUnit()))
set nR=ModuloReal(nR+20,360)
loop
exitwhen i>3
set nR=ModuloReal(nR+350,360)
set l2=rR(l1,'d',nR)
call EN(Q,GetTriggerUnit(),GetLocationX(l2),GetLocationY(l2))
call RemoveLocation(l2)
set i=i+1
endloop
call RemoveLocation(l1)
set l1=null
set l2=null
return true
endfunction
function Jh takes nothing returns boolean
local unit u=GetSpellAbilityUnit()
local unit u2
local group g=CreateGroup()
local real xF
local real x=GetUnitX(GetSpellTargetUnit())
local real y=GetUnitY(GetSpellTargetUnit())
local real aR=SquareRoot((GetUnitX(u)-x)*(GetUnitX(u)-x)+(GetUnitY(u)-y)*(GetUnitY(u)-y))
call cN('h09Q',u,u,3)
call IssuePointOrderById(bj_lastCreatedUnit,851984,x,y)
call TriggerSleepAction(aR/ 700)
call iN(cv,u,x,y)
set av=u
call GroupEnumUnitsInRange(g,x,y,300,Rv)
loop
set u2=FirstOfGroup(g)
exitwhen u2==null
call GroupRemoveUnit(g,u2)
set xF=RMinBJ(GetUnitState(u2,UNIT_STATE_MANA),'d')
call SetUnitState(u2,UNIT_STATE_MANA,GetUnitState(u2,UNIT_STATE_MANA)-xF)
if(xF>0)then
call IB("Abilities\\Spells\\Human\\Feedback\\SpellBreakerAttack.mdl",u2,"origin")
call UnitDamageTarget(bj_lastCreatedUnit,u2,xF,true,false,ATTACK_TYPE_CHAOS,DAMAGE_TYPE_NORMAL,WEAPON_TYPE_WHOKNOWS)
endif
endloop
call DestroyGroup(g)
set g=null
return true
endfunction
function kh takes nothing returns boolean
local unit u=GetSpellAbilityUnit()
local player p=GetOwningPlayer(u)
local real aR=GetRandomReal(70,350)
local real nR=GetRandomReal(0,360)
local real x=GetUnitX(u)+aR*Cos(nR*bj_DEGTORAD)
local real y=GetUnitY(u)+aR*Sin(nR*bj_DEGTORAD)
call cN('h09M',u,u,3)
call IssuePointOrderById(bj_lastCreatedUnit,851984,x,y)
call TriggerSleepAction(aR/ 700)
set u=CreateUnit(p,'n025',x,y,nR)
call GroupAddUnit(Ki,u)
return true
endfunction
function Kh takes nothing returns boolean
local unit u=GetSpellAbilityUnit()
local group g=CreateGroup()
local integer i=0
local unit u2
set av=u
call GroupEnumUnitsInRange(g,GetUnitX(GetSpellTargetUnit()),GetUnitY(GetSpellTargetUnit()),400,Ov)
loop
set u2=FirstOfGroup(g)
set i=i+1
exitwhen u2==null
exitwhen i>4
call GroupRemoveUnit(g,u2)
call aN(ev,u,u2)
endloop
call DestroyGroup(g)
set g=null
return true
endfunction
function lh takes nothing returns boolean
call aN(xv,GetSpellAbilityUnit(),GetSpellTargetUnit())
return true
endfunction
function Lh takes nothing returns boolean
local unit u=GetSpellAbilityUnit()
local group g=CreateGroup()
local integer i=0
local unit u2
call GroupEnumUnitsInRange(g,GetUnitX(GetSpellTargetUnit()),GetUnitY(GetSpellTargetUnit()),350,null)
loop
exitwhen i>2
set u2=FirstOfGroup(g)
exitwhen u2==null
call GroupRemoveUnit(g,u2)
if(not IsUnitType(u2,UNIT_TYPE_DEAD))and((Fi[GetPlayerId(GetOwningPlayer((u2)))+1])!=(Fi[GetPlayerId(GetOwningPlayer((u)))+1]))and IsUnitType(u2,UNIT_TYPE_GROUND)then
set i=i+1
call aN(Hv,u,u2)
endif
endloop
call DestroyGroup(g)
set g=null
return true
endfunction
function mh takes nothing returns boolean
call nN(dv,GetSpellAbilityUnit(),GetSpellTargetUnit())
return true
endfunction
function Mh takes nothing returns boolean
call xN(q,GetSpellAbilityUnit())
call IB("Abilities\\Spells\\Other\\HowlOfTerror\\HowlCaster.mdl",GetSpellAbilityUnit(),"origin")
return true
endfunction
function ph takes nothing returns boolean
call xN(Fv,GetSpellAbilityUnit())
call IB("Abilities\\Spells\\Orc\\WarStomp\\WarStompCaster.mdl",GetSpellAbilityUnit(),"origin")
return true
endfunction
function Ph takes nothing returns boolean
call IB("Abilities\\Spells\\NightElf\\BattleRoar\\RoarCaster.mdl",GetSpellAbilityUnit(),"origin")
call xN(T,GetSpellAbilityUnit())
return true
endfunction
function qh takes nothing returns boolean
local unit u=GetSpellAbilityUnit()
call UnitRemoveAbility(GetSpellAbilityUnit(),'A00F')
call xN(Qv,u)
call IB("Units\\NightElf\\Wisp\\WispExplode.mdl",u,"origin")
call TriggerSleepAction(.3)
call IssuePointOrderByIdLoc(u,851986,Yx[ModuloInteger(Fi[(1+GetPlayerId(GetOwningPlayer(u)))]+1,2)])
call TriggerSleepAction(5)
call IssueImmediateOrderById(u,851993)
call TriggerSleepAction(6.6)
call UnitAddAbility(u,'A00F')
call pA(u)
return true
endfunction
function Qh takes nothing returns boolean
local unit u=GetSpellAbilityUnit()
call aN(sv,u,GetSpellTargetUnit())
call TriggerSleepAction(.8)
call pA(u)
return true
endfunction
function sh takes nothing returns boolean
local unit u=GetSpellAbilityUnit()
call aN(lv,u,GetSpellTargetUnit())
call TriggerSleepAction(.8)
call pA(u)
return true
endfunction
function Sh takes nothing returns boolean
local unit u=GetSpellAbilityUnit()
call aN(gv,u,GetSpellTargetUnit())
call IssueImmediateOrderById(u,852126)
call TriggerSleepAction(1.)
call MA(u)
return true
endfunction
function th takes nothing returns boolean
call aN(pv,GetSpellAbilityUnit(),GetSpellTargetUnit())
return true
endfunction
function Th takes nothing returns boolean
local unit u=GetSpellAbilityUnit()
call IssueTargetOrderById(u,852066,GetSpellTargetUnit())
call TriggerSleepAction(1.)
call MA(u)
return true
endfunction
function uh takes nothing returns boolean
local unit u=GetSpellAbilityUnit()
local location l=GetUnitLoc(u)
local group g
set av=u
set g=XR(900.,l,Vv)
call UnitAddAbility(GetSpellTargetUnit(),'A03L')
if(CountUnitsInGroup(g)>0)then
call IssueImmediateOrderById(u,852094)
call TriggerSleepAction(1.)
call pA(u)
endif
call DestroyGroup(g)
call RemoveLocation(l)
set l=null
set g=null
return true
endfunction
function Uh takes nothing returns boolean
local unit u=GetSpellAbilityUnit()
call TriggerSleepAction(1.2)
call IssuePointOrderByIdLoc(u,851983,Yx[(Fi[GetPlayerId(GetOwningPlayer((u)))+1])])
return true
endfunction
function wh takes nothing returns boolean
local integer JR=TO
set zE=UE[JR]
loop
exitwhen zE==0
set YE=zE
set zE=QE[YE]
call kR(YE)
endloop
call FlushChildHashtable(yE,JR)
return true
endfunction
function Wh takes nothing returns boolean
set uO=UA(SO,tO)
return true
endfunction
function yh takes nothing returns boolean
local integer JR=TO
set SX=PX[JR]
loop
exitwhen SX==0
set sX=SX
set SX=KX[sX]
call QR(sX)
endloop
return true
endfunction
function Yh takes nothing returns boolean
local integer JR=TO
set HX=FX[JR]
loop
exitwhen HX==0
set hX=HX
set HX=BX[hX]
call SR(hX)
endloop
return true
endfunction
function zh takes nothing returns boolean
local integer JR=TO
set IX=VX[JR]
loop
exitwhen IX==0
set RX=IX
set IX=xX[RX]
call TR(RX)
endloop
call FlushChildHashtable(OX,JR)
return true
endfunction
function eh takes nothing returns nothing
set sO[3]=CreateTrigger()
call TriggerAddAction(sO[3],function xh)
call TriggerAddCondition(sO[3],Condition(function xh))
set sO[30]=CreateTrigger()
call TriggerAddAction(sO[30],function oh)
call TriggerAddCondition(sO[30],Condition(function oh))
set sO[6]=CreateTrigger()
call TriggerAddAction(sO[6],function rh)
call TriggerAddCondition(sO[6],Condition(function rh))
set sO[26]=CreateTrigger()
call TriggerAddAction(sO[26],function ih)
call TriggerAddCondition(sO[26],Condition(function ih))
set sO[35]=CreateTrigger()
call TriggerAddAction(sO[35],function ah)
call TriggerAddCondition(sO[35],Condition(function ah))
set sO[37]=CreateTrigger()
call TriggerAddAction(sO[37],function nh)
call TriggerAddCondition(sO[37],Condition(function nh))
set sO[25]=CreateTrigger()
call TriggerAddAction(sO[25],function Vh)
call TriggerAddCondition(sO[25],Condition(function Vh))
set sO[14]=CreateTrigger()
call TriggerAddAction(sO[14],function Eh)
call TriggerAddCondition(sO[14],Condition(function Eh))
set sO[42]=CreateTrigger()
call TriggerAddAction(sO[42],function Xh)
call TriggerAddCondition(sO[42],Condition(function Xh))
set sO[12]=CreateTrigger()
call TriggerAddAction(sO[12],function Oh)
call TriggerAddCondition(sO[12],Condition(function Oh))
set sO[8]=CreateTrigger()
call TriggerAddAction(sO[8],function Rh)
call TriggerAddCondition(sO[8],Condition(function Rh))
set sO[21]=CreateTrigger()
call TriggerAddAction(sO[21],function Ih)
call TriggerAddCondition(sO[21],Condition(function Ih))
set sO[16]=CreateTrigger()
call TriggerAddAction(sO[16],function Ah)
call TriggerAddCondition(sO[16],Condition(function Ah))
set sO[7]=CreateTrigger()
call TriggerAddAction(sO[7],function Nh)
call TriggerAddCondition(sO[7],Condition(function Nh))
set sO[34]=CreateTrigger()
call TriggerAddAction(sO[34],function bh)
call TriggerAddCondition(sO[34],Condition(function bh))
set sO[4]=CreateTrigger()
call TriggerAddAction(sO[4],function Bh)
call TriggerAddCondition(sO[4],Condition(function Bh))
set sO[32]=CreateTrigger()
call TriggerAddAction(sO[32],function ch)
call TriggerAddCondition(sO[32],Condition(function ch))
set sO[44]=CreateTrigger()
call TriggerAddAction(sO[44],function Ch)
call TriggerAddCondition(sO[44],Condition(function Ch))
set sO[11]=CreateTrigger()
call TriggerAddAction(sO[11],function dh)
call TriggerAddCondition(sO[11],Condition(function dh))
set sO[38]=CreateTrigger()
call TriggerAddAction(sO[38],function Dh)
call TriggerAddCondition(sO[38],Condition(function Dh))
set sO[19]=CreateTrigger()
call TriggerAddAction(sO[19],function fh)
call TriggerAddCondition(sO[19],Condition(function fh))
set sO[40]=CreateTrigger()
call TriggerAddAction(sO[40],function Fh)
call TriggerAddCondition(sO[40],Condition(function Fh))
set sO[29]=CreateTrigger()
call TriggerAddAction(sO[29],function gh)
call TriggerAddCondition(sO[29],Condition(function gh))
set sO[33]=CreateTrigger()
call TriggerAddAction(sO[33],function Gh)
call TriggerAddCondition(sO[33],Condition(function Gh))
set sO[15]=CreateTrigger()
call TriggerAddAction(sO[15],function hh)
call TriggerAddCondition(sO[15],Condition(function hh))
set sO[17]=CreateTrigger()
call TriggerAddAction(sO[17],function Hh)
call TriggerAddCondition(sO[17],Condition(function Hh))
set sO[2]=CreateTrigger()
call TriggerAddAction(sO[2],function jh)
call TriggerAddCondition(sO[2],Condition(function jh))
set sO[18]=CreateTrigger()
call TriggerAddAction(sO[18],function Jh)
call TriggerAddCondition(sO[18],Condition(function Jh))
set sO[23]=CreateTrigger()
call TriggerAddAction(sO[23],function kh)
call TriggerAddCondition(sO[23],Condition(function kh))
set sO[9]=CreateTrigger()
call TriggerAddAction(sO[9],function Kh)
call TriggerAddCondition(sO[9],Condition(function Kh))
set sO[10]=CreateTrigger()
call TriggerAddAction(sO[10],function lh)
call TriggerAddCondition(sO[10],Condition(function lh))
set sO[31]=CreateTrigger()
call TriggerAddAction(sO[31],function Lh)
call TriggerAddCondition(sO[31],Condition(function Lh))
set sO[20]=CreateTrigger()
call TriggerAddAction(sO[20],function mh)
call TriggerAddCondition(sO[20],Condition(function mh))
set sO[1]=CreateTrigger()
call TriggerAddAction(sO[1],function Mh)
call TriggerAddCondition(sO[1],Condition(function Mh))
set sO[22]=CreateTrigger()
call TriggerAddAction(sO[22],function ph)
call TriggerAddCondition(sO[22],Condition(function ph))
set sO[5]=CreateTrigger()
call TriggerAddAction(sO[5],function Ph)
call TriggerAddCondition(sO[5],Condition(function Ph))
set sO[41]=CreateTrigger()
call TriggerAddAction(sO[41],function qh)
call TriggerAddCondition(sO[41],Condition(function qh))
set sO[43]=CreateTrigger()
call TriggerAddAction(sO[43],function Qh)
call TriggerAddCondition(sO[43],Condition(function Qh))
set sO[36]=CreateTrigger()
call TriggerAddAction(sO[36],function sh)
call TriggerAddCondition(sO[36],Condition(function sh))
set sO[24]=CreateTrigger()
call TriggerAddAction(sO[24],function Sh)
call TriggerAddCondition(sO[24],Condition(function Sh))
set sO[39]=CreateTrigger()
call TriggerAddAction(sO[39],function th)
call TriggerAddCondition(sO[39],Condition(function th))
set sO[27]=CreateTrigger()
call TriggerAddAction(sO[27],function Th)
call TriggerAddCondition(sO[27],Condition(function Th))
set sO[28]=CreateTrigger()
call TriggerAddAction(sO[28],function uh)
call TriggerAddCondition(sO[28],Condition(function uh))
set sO[13]=CreateTrigger()
call TriggerAddAction(sO[13],function Uh)
call TriggerAddCondition(sO[13],Condition(function Uh))
set MO=CreateTrigger()
call TriggerAddCondition(MO,Condition(function wh))
set QO=CreateTrigger()
call TriggerAddCondition(QO,Condition(function Wh))
set mO[12]=null
set mO[13]=null
set qO=CreateTrigger()
call TriggerAddCondition(qO,Condition(function yh))
set PO=CreateTrigger()
call TriggerAddCondition(PO,Condition(function Yh))
set pO=CreateTrigger()
call TriggerAddCondition(pO,Condition(function zh))
call ExecuteFunc("lI")
call ExecuteFunc("MI")
call ExecuteFunc("BN")
endfunction
