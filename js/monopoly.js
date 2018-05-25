var Monopoly = {};
Monopoly.allowRoll = true;
Monopoly.moneyAtStart = 500;
Monopoly.doubleCounter = 0;

// initiliazing game
Monopoly.init = function(){
    $(document).ready(function(){
        Monopoly.adjustBoardSize();
        $(window).bind("resize",Monopoly.adjustBoardSize);
        Monopoly.initDice();
        Monopoly.initPopups();
        Monopoly.start();
    });
};

//display intro popup
Monopoly.start = function(){
    Monopoly.showPopup("intro")
};


Monopoly.initDice = function(){
    $(".dice").click(function(){
        if (Monopoly.allowRoll){
            Monopoly.rollDice();
        }
    });
};

// get the current player
Monopoly.getCurrentPlayer = function(){
    return $(".player.current-turn");
};

Monopoly.getPlayersCell = function(player){
    return player.closest(".cell");
};


Monopoly.getPlayersMoney = function(player){
    return parseInt(player.attr("data-money"));
};


// function that allows the money to be updated
Monopoly.updatePlayersMoney = function(player,amount){
    var playersMoney = parseInt(player.attr("data-money"));
    playersMoney -= amount;
    if (playersMoney < 0 ){
      var popup = Monopoly.getPopup('broke');
      popup.find('button').unbind('click').bind('click',Monopoly.closePopup);
          Monopoly.showPopup('broke');
          Monopoly.removePlayer(player);
    }
      player.attr("data-money",playersMoney);
      player.attr("title",player.attr("id") + ": $" + playersMoney);
      Monopoly.playSound("chaching");
};

// function that remove a player when a lose
Monopoly.removePlayer = function (player) {
    player.addClass('remove');
    var playerId = player.attr("id");
    var resetCell = $("." + playerId);
    if (resetCell.length > 0) {
      for (var i = 0; i < resetCell.length; i++) {
        resetCell[i].setAttribute("data-owner", "");
        resetCell[i].setAttribute("data-rent", "");
        resetCell[i].removeAttribute("data-owner");
        resetCell[i].removeAttribute("data-rent");
        resetCell[i].classList.add("available");
        resetCell[i].classList.remove(playerId);
    }
  }
}

// randomize the dices
Monopoly.rollDice = function(){
    var result1 = Math.floor(Math.random() * 6) + 1 ;
    var result2 = Math.floor(Math.random() * 6) + 1 ;
    $(".dice").find(".dice-dot").css("opacity",0);
    $(".dice#dice1").attr("data-num",result1).find(".dice-dot.num" + result1).css("opacity",1);
    $(".dice#dice2").attr("data-num",result2).find(".dice-dot.num" + result2).css("opacity",1);
    if (result1 == result2){
      Monopoly.doubleCounter++;
    } else {
      Monopoly.doubleCounter = 0;
    }
    var currentPlayer = Monopoly.getCurrentPlayer();
    Monopoly.handleAction(currentPlayer,"move",result1 + result2);
};

// make the player mmove
Monopoly.movePlayer = function(player,steps){
    Monopoly.allowRoll = false;
    player.removeClass("smileFace");
    var playerMovementInterval = setInterval(function(){
        if (steps == 0){
            clearInterval(playerMovementInterval);
            Monopoly.handleTurn(player);
        }else{
            var playerCell = Monopoly.getPlayersCell(player);
            var nextCell = Monopoly.getNextCell(playerCell);
            nextCell.find(".content").append(player);
            steps--;
        }
    },200);
};

// localize position of the player
Monopoly.handleTurn = function(){
    var player = Monopoly.getCurrentPlayer();
    var playerCell = Monopoly.getPlayersCell(player);
    if (playerCell.is(".available.property")){
        Monopoly.handleBuyProperty(player,playerCell);
    }else if(playerCell.is(".property:not(.available)")){
         if(!playerCell.hasClass(player.attr("id"))){
           Monopoly.handlePayRent(player,playerCell);
         }else{
           Monopoly.myProp(player);
         }
    }else if(playerCell.is(".go-to-jail")){
        Monopoly.handleGoToJail(player);
    }else if(playerCell.is(".chance")){
        Monopoly.handleChanceCard(player);
    }else if(playerCell.is(".community")){
        Monopoly.handleCommunityCard(player);
    }else{
        Monopoly.setNextPlayerTurn();
    }
}

// display a smiley face of the player is on it's onw property
Monopoly.myProp = function(player){
  player.addClass('smileFace');
  Monopoly.setNextPlayerTurn();
}

// update player turns
Monopoly.setNextPlayerTurn = function(){
    var currentPlayerTurn = Monopoly.getCurrentPlayer();
    var playerId = parseInt(currentPlayerTurn.attr("id").replace("player",""));
    if((Monopoly.doubleCounter > 0) && !(currentPlayerTurn.is(".jailed"))){
        var nextPlayerId = playerId;
    } else{
        var nextPlayerId = playerId + 1;
    }

    if (nextPlayerId > $(".player").length){
        nextPlayerId = 1;
    }
    currentPlayerTurn.removeClass("current-turn");
    var nextPlayer = $(".player#player" + nextPlayerId);
    nextPlayer.addClass("current-turn");
    if (nextPlayer.is(".jailed")){
        var currentJailTime = parseInt(nextPlayer.attr("data-jail-time"));
        currentJailTime++;
        nextPlayer.attr("data-jail-time",currentJailTime);
        if (currentJailTime > 3){
            nextPlayer.removeClass("jailed");
            nextPlayer.removeAttr("data-jail-time");
        }
        Monopoly.setNextPlayerTurn();
        return;
    }

    if(nextPlayer.hasClass('remove')){
      Monopoly.setNextPlayerTurn();
      return;
    }

    Monopoly.closePopup();
    Monopoly.allowRoll = true;
};

// if the player have the opportinuty to buy a property: shows appropriate popup
Monopoly.handleBuyProperty = function(player,propertyCell){
    var propertyCost = Monopoly.calculateProperyCost(propertyCell);
    var popup = Monopoly.getPopup("buy");
    popup.find(".cell-price").text(propertyCost);
    popup.find("button").unbind("click").bind("click",function(){
        var clickedBtn = $(this);
        if (clickedBtn.is("#yes")){
            Monopoly.handleBuy(player,propertyCell,propertyCost);
        }else{
            Monopoly.closeAndNextTurn();
        }
    });
    Monopoly.showPopup("buy");
};

// if the player is on an opposing players property: shows appropriate popup
Monopoly.handlePayRent = function(player,propertyCell){
    var popup = Monopoly.getPopup("pay");
    var currentRent = parseInt(propertyCell.attr("data-rent"));
    var properyOwnerId = propertyCell.attr("data-owner");
    popup.find("#player-placeholder").text(properyOwnerId);
    popup.find("#amount-placeholder").text(currentRent);
    popup.find("button").unbind("click").bind("click",function(){
        var properyOwner = $(".player#"+ properyOwnerId);
        Monopoly.closeAndNextTurn();
        Monopoly.updatePlayersMoney(player,currentRent);
        Monopoly.updatePlayersMoney(properyOwner,-1*currentRent);

    });
   Monopoly.showPopup("pay");
};

// if the player go to jail: shows appropriate popup
Monopoly.handleGoToJail = function(player){
    var popup = Monopoly.getPopup("jail");
    popup.find("button").unbind("click").bind("click",function(){
        Monopoly.handleAction(player,"jail");
    });
    Monopoly.showPopup("jail");
};

// if the player is on chance tyle: shows appropriate popup
Monopoly.handleChanceCard = function(player){
    var popup = Monopoly.getPopup("chance");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_chance_card", function(chanceJson){
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action",chanceJson["action"]).attr("data-amount",chanceJson["amount"]);
    },"json");
    popup.find("button").unbind("click").bind("click",function(){
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        Monopoly.handleAction(player,action,amount);
    });
    Monopoly.showPopup("chance");
};

// if the player is on community tyle: shows appropriate popup
Monopoly.handleCommunityCard = function(player){
  var popup = Monopoly.getPopup("community");
  popup.find(".popup-content").addClass("loading-state");
  $.get("https://itcmonopoly.appspot.com/get_random_community_card", function(chanceCom){
      popup.find(".popup-content #text-placeholder").text(chanceCom["content"]);
      popup.find(".popup-title").text(chanceCom["title"]);
      popup.find(".popup-content").removeClass("loading-state");
      popup.find(".popup-content button").attr("data-action",chanceCom["action"]).attr("data-amount",chanceCom["amount"]);
  },"json");
  popup.find("button").unbind("click").bind("click",function(){
      var currentBtn = $(this);
      var action = currentBtn.attr("data-action");
      var amount = currentBtn.attr("data-amount");
      Monopoly.handleAction(player,action,amount);
  });
  Monopoly.showPopup("community");
};

// function that send a player to jail
Monopoly.sendToJail = function(player){
    player.addClass("jailed");
    player.attr("data-jail-time",1);
    $(".corner.game.cell.in-jail").append(player);
    Monopoly.playSound("woopwoop");
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

// get popup
Monopoly.getPopup = function(popupId){
    return $(".popup-lightbox .popup-page#" + popupId);
};

// calculate price of properties
Monopoly.calculateProperyCost = function(propertyCell){
    var cellGroup = propertyCell.attr("data-group");
    var cellPrice = parseInt(cellGroup.replace("group","")) * 5;
    if (cellGroup == "rail"){
        cellPrice = 10;
    }
    return cellPrice;
};

// calculate rent of each property
Monopoly.calculateProperyRent = function(propertyCost){
    return propertyCost/2;
};

// calling function that set the next player turn and close the popup
Monopoly.closeAndNextTurn = function(){
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

//
Monopoly.initPopups = function(){
    $(".popup-page#intro").find("button").click(function(){
        var numOfPlayers = $(this).closest(".popup-page").find("input").val();
        var parsetest = parseInt(numOfPlayers);
        if (Monopoly.isValidInput("numofplayers",numOfPlayers)){
            Monopoly.createPlayers(numOfPlayers);
            Monopoly.closePopup();
        }
    });
};

// if the player want to buy a property, checking player's money and add appropriate data and class on the cell
Monopoly.handleBuy = function(player,propertyCell,propertyCost){
    var playersMoney = Monopoly.getPlayersMoney(player)
    if (playersMoney < propertyCost){
        Monopoly.showErrorMsg();
        Monopoly.playSound('fail');
    }else{
        Monopoly.updatePlayersMoney(player,propertyCost);
        var rent = Monopoly.calculateProperyRent(propertyCost);

        propertyCell.removeClass("available")
                    .addClass(player.attr("id"))
                    .attr("data-owner",player.attr("id"))
                    .attr("data-rent",rent);
        Monopoly.setNextPlayerTurn();
    }
};

// actions of player
Monopoly.handleAction = function(player,action,amount){
    switch(action){
        case "move":
            Monopoly.movePlayer(player,amount);
            Monopoly.closePopup();
             break;
        case "pay":
            Monopoly.updatePlayersMoney(player,amount);
            Monopoly.setNextPlayerTurn();
            break;
        case "jail":
            Monopoly.sendToJail(player);
            Monopoly.closePopup();
            break;
    };
};

// creating players
Monopoly.createPlayers = function(numOfPlayers){
    var startCell = $(".go");
    for (var i=1; i<= numOfPlayers; i++){
        var player = $("<div />").addClass("player shadowed").attr("id","player" + i).attr("title","player" + i + ": $" + Monopoly.moneyAtStart);
        startCell.find(".content").append(player);
        if (i==1){
            player.addClass("current-turn");
        }
        player.attr("data-money",Monopoly.moneyAtStart);
    }
};

// calculate position
Monopoly.getNextCell = function(cell){
    var currentCellId = parseInt(cell.attr("id").replace("cell",""));
    var nextCellId = currentCellId + 1
    if (nextCellId > 40){
        Monopoly.handlePassedGo();
        nextCellId = 1;
    }
    return $(".cell#cell" + nextCellId);
};

// when the user passe the go, he earns 50
Monopoly.handlePassedGo = function(){
    var player = Monopoly.getCurrentPlayer();
    Monopoly.updatePlayersMoney(player,-50);
};

// checking if user input is valid
Monopoly.isValidInput = function(validate,value){
    var isValid = false;
    switch(validate){
        case "numofplayers":
            if(value > 1 && value <= 4){
                isValid = true;
            }
            break;
    }

    if (!isValid){
        Monopoly.showErrorMsg();
    }
    return isValid;
}

//displaying error message with appropriate style
Monopoly.showErrorMsg = function(){
    $(".popup-page .invalid-error").fadeTo(500,1);
    setTimeout(function(){
            $(".popup-page .invalid-error").fadeTo(500,0);
    },2000);
};


Monopoly.adjustBoardSize = function(){
    var gameBoard = $(".board");
    var boardSize = Math.min($(window).height(),$(window).width());
    boardSize -= parseInt(gameBoard.css("margin-top")) *2;
    $(".board").css({"height":boardSize,"width":boardSize});
}

// allows poput to close
Monopoly.closePopup = function(){
    $(".popup-lightbox").fadeOut();
};

// allows sound to be play
Monopoly.playSound = function(sound){
    var snd = new Audio("./sounds/" + sound + ".wav");
    snd.play();

    var money = new Audio('./sounds/' + sound +".wav")
    money.play();
}


// allows to display popup
Monopoly.showPopup = function(popupId){
    $(".popup-lightbox .popup-page").hide();
    $(".popup-lightbox .popup-page#" + popupId).show();
    $(".popup-lightbox").fadeIn();
};

Monopoly.init();
