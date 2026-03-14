curl -X POST http://localhost:8888/api/game/new/quest \
 -H "Content-Type: application/json" \
 -d @/tmp/carovana_del_ghiaccio.json

---

{
"key": "carovana*del_ghiaccio",
"title": "La Carovana del Ghiaccio",
"description": "Nella tenda di una slitta in viaggio, Dartha e Seto cucinano lo stufato di oxto mentre la carovana attraversa una valle glaciale. Un tempio antico li attende sulla montagna.",
"map": {
"width": 10,
"height": 10,
"layers": [
{
"name": "sand",
"data": [30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
"properties": [{"name": "collision", "type": "bool", "value": false}],
"type": "tilelayer"
},
{
"name": "wall",
"height": 10,
"width": 10,
"data": [
10,10, 0, 0, 0, 0, 0, 0,10,10,
10,10, 0, 0, 0, 0, 0, 0,10,10,
10,10,10, 0, 0, 0, 0,10,10,10,
10,10,10, 0, 0, 0, 0,10,10,10,
10,10,10, 0, 0, 0, 0,10,10,10,
10,10, 0, 0, 0, 0, 0, 0,10,10,
0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
0, 0, 0, 0, 0, 0, 0, 0, 0, 0
],
"properties": [{"name": "collision", "type": "bool", "value": true}],
"type": "tilelayer"
}
]
},
"stages": [
{ "id": "nella_tenda", "description": "Sei nella tenda della carovana con Seto. Parlagli." },
{ "id": "guarda_fuori", "description": "Seto è andato da suo padre. Avanzati verso le montagne e guarda il paesaggio." },
{ "id": "verso_il_tempio","description": "Segui Seto verso il tempio antico sulla montagna." }
],
"objectives": {
"talk_to_seto_1": {
"type": "dialog",
"description": "Parla con Seto nella tenda",
"condition": {},
"status": "pending"
},
"see_temple": {
"type": "reach_cell",
"description": "Guarda fuori dalla tenda — scorgi un tempio antico tra le montagne",
"condition": { "cell": [4, 5] },
"status": "pending"
},
"talk_to_seto_2": {
"type": "dialog",
"description": "Accetta l'invito di Seto ad esplorare il tempio",
"condition": {},
"status": "pending"
},
"reach_temple": {
"type": "reach_cell",
"description": "Raggiungi il tempio sulla montagna",
"condition": { "cell": [4, 1] },
"status": "pending"
}
},
"blockedZones": {
"passo_montagna": {
"cells": [[3, 2], [4, 2], [5, 2], [6, 2]],
"status": "locked",
"unlockCondition": { "type": "objective", "objectiveKey": "talk_to_seto_2" }
}
},
"dialogs": {
"seto_dialog": {
"conditionalStart": [
{
"condition": { "objectivesComplete": ["talk_to_seto_1", "see_temple"] },
"nodeId": "invitation"
},
{
"condition": { "objectivesComplete": ["talk_to_seto_1"] },
"nodeId": "busy"
}
],
"nodes": {
"start": {
"speaker": "seto",
"text": "Non capisco proprio perché ci costringiamo a vivere circondati dal ghiaccio quando nelle Terre Varme potremmo camminare nudi scaldati da Feraje.",
"choices": [
{ "text": "Ma le Terre Varme sono pericolose, Seto.", "next": "risposta" },
{ "text": "Concordo. Questo ghiaccio è insopportabile.", "next": "concorda" }
]
},
"concorda": {
"speaker": "seto",
"text": "Lo sapevo! Finalmente qualcuno che capisce. Un giorno—",
"choices": [
{ "text": "Però là gli uomini combattono per le gemme.", "next": "risposta" }
]
},
"risposta": {
"speaker": "seto",
"text": "Sì, ci sarà caldo, ma non sono luoghi sicuri. Gli uomini sono intrisi di odio e combattono per le gemme. Lo sai benissimo. Buono questo stufato, per inciso.",
"choices": [
{ "text": "Davvero ottimo. Sei un ottimo cuoco, Seto.", "next": "chiamata" }
]
},
"chiamata": {
"speaker": "seto",
"text": "Grazie! Sei il miglior— \_Una voce da fuori: \"Seto! Seto! Ti cerca tuo padre!\"* Devo andare. Torno subito.",
"choices": [
{
"text": "Vai pure. Intanto guardo fuori.",
"next": null,
"effects": [
{ "type": "complete_objective", "objectiveKey": "talk_to_seto_1" },
{ "type": "advance_stage", "stage": "guarda_fuori" }
]
}
]
},
"busy": {
"speaker": "seto",
"text": "Sono appena tornato da Ra. Mi ha detto qualcosa di interessante. Guarda fuori intanto — le montagne sono magnifiche da qui.",
"choices": [
{ "text": "D'accordo.", "next": null }
]
},
"invitation": {
"speaker": "seto",
"text": "Dartha! Hai visto anche tu quel tempio lassù? Ra dice che è antico, forse risale all'epoca di Feraje. È qui vicino — mezz'ora a piedi dalla carovana. Vuoi accompagnarmi?",
"choices": [
{
"text": "Dammi un attimo, mi vesto e arrivo!",
"next": null,
"effects": [
{ "type": "complete_objective", "objectiveKey": "talk_to_seto_2" },
{ "type": "unlock_zone", "zoneKey": "passo_montagna" },
{ "type": "advance_stage", "stage": "verso_il_tempio" }
]
},
{ "text": "È sicuro?", "next": "sicuro" }
]
},
"sicuro": {
"speaker": "seto",
"text": "Più sicuro delle Terre Varme, di sicuro! Forza — la carovana si ferma per qualche ora. È l'occasione perfetta.",
"choices": [
{
"text": "Hai ragione. Andiamo!",
"next": null,
"effects": [
{ "type": "complete_objective", "objectiveKey": "talk_to_seto_2" },
{ "type": "unlock_zone", "zoneKey": "passo_montagna" },
{ "type": "advance_stage", "stage": "verso_il_tempio" }
]
}
]
}
}
}
},
"players": [
{
"key": "dartha",
"label": "Dartha",
"cell": [4, 8],
"weap1Key": null,
"weap2Key": null,
"armorKey": null,
"spellKeys": []
}
],
"npcs": [
{
"key": "seto",
"label": "Seto",
"cell": [5, 7],
"dialogKey": "seto_dialog",
"weap1Key": null,
"weap2Key": null,
"armorKey": null,
"spellKeys": []
}
]
}
