var button = document.getElementById("genButton"); //  Assign html button to button object
var passphraseArray = new Array(5); //  Create passphraseArray
database = firebase.database(); //  Creates firebase object reference
var ref = database.ref(); //  Creates reference to database object
var resultsIndex = 0; //  resultsIndex declared to move through resultsArray
var arrayIndex = 0; //  arrayIndex declared to move through passphraseArray

//  Function to return Chrome history and record it into console log
var getLastUrl = function(callback) {
    chrome.history.search({ //  Function searches and stores last 100x results from Chrome history
        text: '',
        maxResults: 100
    }, function(results) {
        console.log(results); //  Logs result into console log
        callback(results);
    });
};

//  Results of titles from Chrome history stored in 'resultsArray'
var resultsArray = new Array(100); //  resultsArray declared to store titles from Chrome history
var a = 0;
for (var x = 0; x <= 100; x++) { //  Runs through all 100x results
    getLastUrl(function(lastUrl) {
        resultsArray[a] = lastUrl[a].title; //  Uses getLastUrl callback function above to return seach item
        a++;
    });
}

//  Determines if a title is suitable for being a passphrase and if so calculates it's 2-bit entropy
getLastUrl(function(lastUrl) {
    var resultsIndex = 0;
    var arrayIndex = 0;
    while (resultsIndex < 5) { // Loop runs until five results are found
        var tempPhrase = resultsArray[arrayIndex].split(" "); // Splits title of resultsArray index arrayIndex by space into array tempPhrase
        var tpal = tempPhrase.length; // Length of array stored as tpal
        if (tempPhrase[tpal - 1] == "Search" && tempPhrase[tpal - 2] == "Google") { // If the url is from a search the last two words in title are 'google' and 'Search'
            if (tempPhrase[0] == "who" || tempPhrase[0] == "Who" || tempPhrase[0] == "WHO" || // Checking if the first word is a question word
                tempPhrase[0] == "what" || tempPhrase[0] == "What" || tempPhrase[0] == "WHAT" ||
                tempPhrase[0] == "where" || tempPhrase[0] == "Where" || tempPhrase[0] == "WHERE" ||
                tempPhrase[0] == "when" || tempPhrase[0] == "When" || tempPhrase[0] == "WHEN" ||
                tempPhrase[0] == "why" || tempPhrase[0] == "Why" || tempPhrase[0] == "WHY" ||
                tempPhrase[0] == "how" || tempPhrase[0] == "How" || tempPhrase[0] == "HOW") {

                var thepassphrase = ""; //  Passphrase declared empty
                for (var z = 0; z < tpal - 3; z++) { //  Loop creates a single word passphrase from temphrase array omitting '- Google Search'
                    thepassphrase = thepassphrase + tempPhrase[z];
                }

                //  Entropy calculations follow
                var pplength = thepassphrase.length; //  Number of characters in passphrase stored in pplength
                if (pplength > 30) { //  If the passphrase is over 30 characters in length...
                    thepassphrase = thepassphrase.slice(0, 30); //  ...it is split to only consist of the first 30 characters
                }

                var ppCharRange = 0; //  Range of characters set to zero
                var upperCase = false; //  Variables for whether different types of characters are present declared
                var lowerCase = false;
                var numeric = false;
                var specialChar = false;
                for (var y = 0; y < thepassphrase.length; y++) { //  Checks each character to see where it is in ASCII table
                    var asciiChar = thepassphrase.charCodeAt(y); //  Returns ASCII value of current character
                    // ASCII characters 0 - 32 are control characters and 'space'
                    if (asciiChar >= 33 && asciiChar <= 47) specialChar = true; //  If a character is within a range of a character type...
                    if (asciiChar >= 48 && asciiChar <= 57) numeric = true; //  ...the boolean for that character type is set to true
                    if (asciiChar >= 58 && asciiChar <= 64) specialChar = true;
                    if (asciiChar >= 65 && asciiChar <= 90) upperCase = true;
                    if (asciiChar >= 91 && asciiChar <= 96) specialChar = true;
                    if (asciiChar >= 97 && asciiChar <= 122) lowerCase = true;
                    if (asciiChar >= 123 && asciiChar <= 126) specialChar = true;
                }
                //  Boolean variables to denote if characters exist within certain ranges cause addition to the character range
                if (upperCase == true) ppCharRange = ppCharRange + 26;
                if (lowerCase == true) ppCharRange = ppCharRange + 26;
                if (numeric == true) ppCharRange = ppCharRange + 10;
                if (specialChar == true) ppCharRange = ppCharRange + 32;
                //  Combinations of letters in the range calculated = Range of characters ^ Number of characters
                var possCombinations = Math.pow(ppCharRange, thepassphrase.length);
                var ent = Math.log2(possCombinations); //  log2 of possCombinations = entropy of passphrase

                //  New passphrase object constructed using passphrase and entropy
                var presentInDB = "";
                var newpassphrase = {
                    pass: thepassphrase,
                    entropy: ent,
                    pIDB: presentInDB,
                    res: resultsIndex
                };
                passphraseArray[resultsIndex] = newpassphrase;
                resultsIndex++; //  Iterates to the next empty item of the resultsIndex array
            }
        }
        arrayIndex++; //  Iterates to the next item in the Chrome history
        if (arrayIndex >= 100) break; //  If the 100th item is reached the loop exits
    }
});


//  Whereas the above code happens on extension load, the following when the button is pressed
var bottomSectionOutput = "";
button.onclick = async function() { //  The function runs when button is clicked

    //  If the user hasn't entered a question phrase in their last 100 chrome history result there may be no result.  This is caught below
    if (passphraseArray[0] == null) {
        bottomSectionOutput = "<br><b>No results, try typing questions into search bar starting with a question word.</b><br><br>";
        lowercontent.innerHTML = bottomSectionOutput;
        //  Following code runs if there are results in the user's history.
    } else {
        bottomSectionOutput = "<br><b>Your Passphrase results ranked from strongest to weakest:</b><br><br>"; // Description of results to follow added to bottomSectionOutput
        passphraseArray.sort(function(a, b) {
            return b.entropy - a.entropy
        }); //  Passphrase objects sorted in the array in order in array from highest to lowest entropy
        for (var i = 0; i < 5; i++) {
            if (passphraseArray[i] == null) break; //  If a passphrase array element is empty the loop breaks - this is if less than five results are returned
            dbcheck(i);
        }

        //  Function to amend the text output in the extension depending on results
        function outputHTML() {
            //  If statement checks if passphrase objects have been checked against the database - pIDB will not be null if they have
            if (passphraseArray[0] != null && passphraseArray[0].pIDB != "") {
                passphraseArray.sort(function(a, b) {
                    return b.entropy - a.entropy
                });
                for (var j = 0; j < 5; j++) {
                    if (passphraseArray[j] == null) break;
                    var itemNo = j + 1;
                    if (passphraseArray[j].entropy > 80) bottomSectionOutput = bottomSectionOutput + itemNo + ": <b><i>" + passphraseArray[j].pass + "</b></i> has entropy: <b><i> " + passphraseArray[j].entropy.toFixed(2) + "</b></i>" + passphraseArray[j].pIDB + "<br><br>";
                }
                lowercontent.innerHTML = bottomSectionOutput;
                button.disabled = true;
                button.style.backgroundColor = "gainsboro";
                button.style.borderColor = "silver";
            } else {
                setTimeout(outputHTML, 100); //  If the array is empty, the function is called again after 100ms to allow time to access database
            }
        }
        outputHTML();
    }
}

//  Function to check if passphrase is in rock you passphrase list
async function dbcheck(data) {
    var pphrase = passphraseArray[data].pass;
    ref.orderByChild("password").equalTo(pphrase).once("value", snapshot => {
        const userData = snapshot.val();
        //  If passphrase is present, entropy is set to the entropy based on a single search of rock you list
        if (userData) {
            if (passphraseArray[data].entropy > 23.77) {
                passphraseArray[data].entropy = 23.77;
            }
            passphraseArray[data].pIDB = "x";
            //  Otherwise the passphrase output text is amended to show it is not in the rock you list
        } else {
            passphraseArray[data].pIDB = " - and is not present in the RockYou leaked password list.";
        }
    });
}
