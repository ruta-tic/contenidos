--Send
gamestart
data: { level: (0-n) }

--Send
gamestate
data: null

--Receive
gamestate
data: {
    timeframe: (1|4), //This value indicates the time speed of execution
    currenttime: timestamp,
    team: [{ id: '', name: '' }],
    games: [{id: '', state: 'failed|succeed|started|nonstarted', score: 0-100}],
    duedate: timestamp, //Estimated time for the game end.
    health: {
        general: 0-100, //Estimated percentage value for game end. When value reach 0 the game ends, 
        details: [ { zone: 1-n, value: 0-100 }],
        lastmeasured: timestamp,
        lifetime: timestamp  //Time remaining for the resources or population to end.
    },
    actions: {
        available: [id1, id2, xx ],
        running: [{id: '', starttime: timestamp }],
        resources: [{
            type: '(human|physical|energy)'
            value: 0-100
        }]
    },
    technologies: {
        available: [id1, id2, xx ],
        running: [{id: '', starttime: timestamp }],
        resources: [{ type: '(capacity)', value: 0-100}]
    },
    files: [{id: X, name: 'File Name', type: '' }] //The type indicates the icon to show
}

--Send
changetimeframe
data: { timeframe: (1|4) }

--Receive 
data: {
    duedate: timestamp
}

--Send
playaction
data: {id: '', parameters: [args...] }

--Receive
playaction
data: {
    id: '',
    starttime: timestamp,
    resources: [{
        type: '(human|physical|energy)'
        value: 0-100
    }]
}

--Send
playtechnology
data: {id: '', parameters: [args...] }

--Receive
playtechnology
data: {
     id: '', 
     starttime: timestamp,
     resources: [{ type: '(capacity)', value: 0-100}]
}

--Send
stopaction
data: {id: '' }

--Receive
stopaction
data: {
    id: '', 
    resources: [{
        type: '(human|physical|energy)'
        value: 0-100
    }]
}

--Send
stoptechnology
data: {id: '' }

--Receive
stoptechnology
data: {
    id: '', 
    resources: [{ type: '(capacity)', value: 0-100}]
}

--Receive
actioncompleted
data: {
    id: '', 
    resources: [{
        type: '(human|physical|energy)',
        value: 0-100
    }]
}


--Receive
technologycompleted
data: {
    id: '',
    resources: [{ type: '(capacity)', value: 0-100}],
    files: [{id: '', name: 'File Name', type: '' }]
}

--Receive
healthupdate
data: {
    general: 0-100, //Estimated percentage value for game end. When value reach 0 the game ends, 
    details: [ { zone: 1-n, value: 0-100 }],
    lastmeasured: timestamp
    duedate: timestamp
}

--Send
gameover
data: null


--Receive
gameover 
data: {
    reason: 'timeout|resourcesout|victory'

}



--Scorm
Poner en finalizado siempre que se actualice el scorm.
