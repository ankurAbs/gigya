var arr = window.location.href.split("/");
var currentCSSHostname = "//" + arr[2];
var currentDomain = arr[0] + "//" + arr[2];
var qs_returnURL = getQSParameterByName("ReturnUrl");
redirectDashboardURL = typeof dashboardPageURL == 'undefined' ? "/dashboard.aspx" : dashboardPageURL;
qs_returnURL = qs_returnURL == undefined ? redirectDashboardURL : qs_returnURL;
qs_returnURL = encodeURIComponent(qs_returnURL).replace(/'/g, "").replace(/%2F/g, "/").replace(/%3F/g, "?").replace(/%3D/g, "=");
var returnURL = currentDomain + qs_returnURL;
var appURL = returnURL;
var cancelURL = returnURL;
cancelURL = (window.location.href.toLowerCase().indexOf('/login.aspx') > 0 | window.location.href.toLowerCase().indexOf('/register.aspx') > 0 | window.location.href.toLowerCase().indexOf('/reset-password.aspx') > 0) ? currentDomain : cancelURL;
var successURL = returnURL;
var profileDeleteURL = returnURL;
var referringURL = returnURL;
var gigyalanguage = currentAuthLocale.substring(0, 2).toLowerCase();
var globalAccountInfo = {};
var gigya_extraProfileFields = "languages, address, phones, education, educationLevel, honors, publications, patents, certifications, likes, professionalHeadline, bio, industry, specialities, work, skills, religion, politicalView, interestedIn, relationshipStatus, hometown, favorites, followersCount, followingCount, username, name, locale, verified, timezone, samlData,culture";
var gigya_extraInclude = "identities-active, identities-all, identities-global, loginIDs, emails, profile, data, regSource, irank, isLockedOut, lastLoginLocation, rba, subscriptions, userInfo, preferences, groups, id_token";
var isNewUser = false;
var isNewUserActive = true;
//Once the Gigya scripts are loaded,init all components
var onGigyaServiceReady = function (serviceName) {
    gigya.events.addMap({ eventMap: [{ events: 'afterScreenLoad', args: [function (e) { return e; }], method: function method(e) { afterScreenLoadCallback(e) } }] });
    getAccountInfo(showAccountInfo);
    // register an event handler for Gigya onLogin event
    gigya.accounts.addEventHandlers({
        onLogin: gigyaOnLoginHandler,
        onLogout: gigyaOnLogoutHandler
    });
    if ($('#gigya-screensetcontainer').length > 0) {
        if (gigya_screen_id == "gigya-signup-screen") {
            gigya.accounts.showScreenSet({ containerID: 'gigya-screensetcontainer', lang: gigyalanguage, screenSet: gigya_screen_set, startScreen: gigya_screen_id, onAfterSubmit: onAfterSignup, onFieldChanged: hideshowonFieldChanged });
        }
        else if (gigya_screen_id == "gigya-doccheck-signup-screen") {
            gigya.accounts.showScreenSet({ containerID: 'gigya-screensetcontainer', lang: gigyalanguage, screenSet: gigya_screen_set, startScreen: gigya_screen_id, onAfterSubmit: registerUMMUser });
        }
        else if (gigya_screen_id == "gigya-login-screen") {
            gigya.accounts.showScreenSet({ containerID: 'gigya-screensetcontainer', lang: gigyalanguage, screenSet: gigya_screen_set, startScreen: gigya_screen_id, onBeforeSubmit: onBeforeLogin, onAfterScreenLoad: onAfterLoginScreenLoad });
        }
        else if (gigya_screen_id == "gigya-profile-screen") {
            gigya.accounts.showScreenSet({ containerID: 'gigya-screensetcontainer', lang: gigyalanguage, screenSet: gigya_screen_set, startScreen: gigya_screen_id, onAfterScreenLoad: gigyaAfterProfileScreenLoad, onAfterSubmit: gigyaAfterProfileSubmit });
        }
        else {
            gigya.accounts.showScreenSet({ containerID: 'gigya-screensetcontainer', lang: gigyalanguage, screenSet: gigya_screen_set, startScreen: gigya_screen_id });
        }
    }
};
//onLogin Event handler
function gigyaOnLoginHandler(eventObj) {
    if (eventObj.data != undefined && eventObj.data.accountId != undefined && eventObj.data.accountId == "") {
        gigya.accounts.showScreenSet({ containerID: 'gigya-screensetcontainer', lang: gigyalanguage, screenSet: gigya_screen_set, startScreen: "gigya-accountid-screen", onBeforeSubmit: gigyaAccountValidate });
    }
    else {
        if (eventObj.newUser != undefined && eventObj.newUser == true) {
            isNewUser = true;
            registerUMMUser(eventObj);
            isNewUserActive = gigyaAccountValidate(eventObj, true);
            if (!isNewUserActive) {
                logoutUserFromGigya(eventObj);
                logoutUserFromPortal(eventObj, true);
            }
        }
        if (isNewUserActive) {
            cpLoginUser(eventObj);
        }

    }
}
function cpLoginUser(eventObj) {
    loginAuthUser('', '', 'login', eventObj);
    setglobalAccountInfo(eventObj);
    //update page fields after login
    showAccountInfo(eventObj);
    if (returnUrl != "" && isglobalAccountInfoValid(eventObj)) {
        window.location.replace(returnUrl);
    }
}
function onAfterSignup(eventObj) {
}
function registerUMMUser(eventObj) {
    if (typeof isGigyaUMMDisabled == 'undefined' || isGigyaUMMDisabled == false) {
        if ((eventObj.response != undefined && eventObj.response.status == "OK") || (eventObj.newUser != undefined && eventObj.newUser == true)) {
            ummId = eventObj.data.userId != undefined ? eventObj.data.userId : null;
            isEmailUpdate = false;
            oldEmail = "";
            newEmail = ""
            if (eventObj.screen != undefined && eventObj.screen == "gigya-change-email-screen") {
                isEmailUpdate = true;
                oldEmail = globalAccountInfo.profile.email;
                newEmail = eventObj.profile.email;
            };
            if (gigya_screen_id == "gigya-profile-screen" && ummId == null) {
                //skip updating profile if customerId is unknown
            }
            else if (isEmailUpdate && oldEmail == newEmail) {
                //skip if email was not changed
            }
            else {
                dummyPassword = 'vr8$Y4M3YA9r';//no need to pass real password to UMM
                //var speciesArray = Object.entries(eventObj.data.second).map(([key, value]) => ({ key, value }));
                var prefix = eventObj.data.prefix == undefined ? "" : eventObj.data.prefix;
                var suffix = eventObj.data.suffix == undefined ? "" : eventObj.data.suffix;
                species = "";
                var primarySpecies = eventObj.data.primarySpecies == undefined ? "" : eventObj.data.primarySpecies;
                if (primarySpecies != "") {
                    species = "{\"isPrimary\": true,\"species\": \"" + primarySpecies.toUpperCase() + "\"},";
                }

                var speciesObj = eventObj.data.second == undefined ? "" : eventObj.data.second;
                if (speciesObj!="") {
                    var speciesArray = Object.keys(speciesObj).map(function (speciesKey) {
                        return { key: speciesKey, value: speciesObj[speciesKey] };
                    });
                    speciesArray.forEach(function (item, index) {
                        if (item.value == true && primarySpecies.toLowerCase() != item.key.toLowerCase()) {
                            species += "{\"isPrimary\": false,\"species\": \"" + item.key.toUpperCase() + "\"},"
                        }
                    });
                }
                species = species.substring(0, species.length - 1);
                gigyaId = eventObj.UID == undefined ? eventObj.response.UID : eventObj.UID;
                var optInEmail = eventObj.data.subscribe == undefined ? false : eventObj.data.subscribe;
                if (isEmailUpdate) {
                    //update email JSON
                    jsonData = '{"email" : "' + globalAccountInfo.profile.email + '","newEmail" : "' + eventObj.profile.email + '"}';
                }
                else if (gigya_screen_id == "gigya-profile-screen") {
                    //update profile JSON
                    jsonData = "{\"businessHeader\": {\"applicationCode\": \"~appcodeplaceholder~\",\"countryCode\": \"" + currentAuthLocale.substring(3) + "\",\"culture\": \"" + currentAuthLocale + "\"  },";
                    jsonData = jsonData + "\"customer\": {\"email\": \"" + eventObj.profile.email + "\",\"prefix\": \"" + prefix + "\",";
                    jsonData = jsonData + "\"firstName\": \"" + eventObj.profile.firstName + "\",";
                    jsonData = jsonData + "\"lastName\": \"" + eventObj.profile.lastName + "\",\"suffix\": \"" + suffix + "\", "
                    jsonData = jsonData + "\"agreements\": {\"optInEmail\": " + optInEmail + ",      \"privacyPolicy\": " + eventObj.data.terms + ",      \"termsAndConditions\": " + eventObj.data.terms + ", \"personalDataProcessing\": " + eventObj.data.terms + "},";
                    jsonData = jsonData + "\"speciesOfInterest\": " + "[" + species + "]";
                    jsonData = jsonData + "}}"
                }
                else {
                    //register new user JSON
                    jsonData = "{  \"businessHeader\": {    \"applicationCode\": \"~appcodeplaceholder~\",    \"campaignCode\": \"\",    \"countryCode\": \"" + currentAuthLocale.substring(3) + "\",    \"referringUrl\": \"\",    \"culture\": \"" + currentAuthLocale + "\"  },  \"customer\": {    ";
                    jsonData = jsonData + "\"email\": \"" + eventObj.profile.email + "\",    \"password\": \"" + dummyPassword + "\",    \"prefix\": \"" + prefix + "\",";
                    jsonData = jsonData + "\"firstName\": \"" + eventObj.profile.firstName + "\",";
                    jsonData = jsonData + "\"lastName\": \"" + eventObj.profile.lastName + "\",    \"crmContactId\": null,    \"suffix\": \"" + suffix + "\",    \"agreements\": { "
                    jsonData = jsonData + "\"optInEmail\": " + optInEmail + ",      \"privacyPolicy\": " + eventObj.data.terms + ",      \"termsAndConditions\": " + eventObj.data.terms + "    },    \"accessCode\": \"\",    \"addresses\": [],    \"contacts\": [],    \"licenses\": [],    \"salesReps\": [],    \"qualifications\": [],    \"speciesOfInterest\": " + "[" + species + "]";
                    jsonData = jsonData + ",    \"subscriptions\": [],    \"relatedOrganizations\": [],    \"accessCodes\": []  },  \"uMMUTMSource\": \"\",  \"uMMLeadSource\": \"\",  \"uMMUTMCampaign\": \"\"}"
                }
                jsonData = JSON.stringify({ ummParamsData: { UserData: jsonData, isValid: "", ummId: ummId == null ? "" : ummId, gigyaId: gigyaId } });
                registerUmmUserURL = registerURL.replace('register.aspx', 'gigyaregisterummuser.aspx');
                //profile register/update
                $.ajax({
                    type: "POST",
                    contentType: "application/json; charset=utf-8",
                    data: jsonData,
                    url: registerUmmUserURL + "/registerUMMUser",
                    dataType: "json",
                    async: false, //important to register before the async login
                    success: function (jdata) {
                        result = jdata.d.isValid;
                        if (result != "false") {
                            if (eventObj.isActive != undefined && eventObj.isActive) {
                                loginAuthUser('', '', 'login', eventObj);
                            }
                            else {
                                //console.log("skip auth for inactive user");
                            }
                            return true;
                        }
                        else {
                            //console.log("account register/update failed");
                            return false;
                        }
                    },
                    error: function () {
                        return false;
                    }
                });
            }
        }
    }
}
function gigyaAccountValidate(eventObj, setInactive) {
    var isValid = false;
    if (typeof isAccountValidationRequired != 'undefined' && isAccountValidationRequired != true) {
        //skip validation
        isValid = true;
    }
    else {
        //validate accountID
        var uid = globalAccountInfo.UID == undefined ? eventObj.UID : globalAccountInfo.UID;
        var accountId = "";
        if (eventObj.data != undefined && eventObj.data.accountId != undefined) {
            accountId = eventObj.data.accountId;
        }
        else if (globalAccountInfo.data != undefined && globalAccountInfo.data.accountId != undefined) {
            accountId = globalAccountInfo.data.accountId;
        }

        var firstName = eventObj.profile.firstName;
        var lastName = eventObj.profile.lastName;
        var isValid = false;
        if (accountId != "") {
            jsonData = JSON.stringify({ accountParams: { accountId: accountId, uid: uid, firstName: firstName, lastName: lastName } });
            gigyavalidateaccount = registerURL.replace('register.aspx', 'gigyavalidateaccount.aspx');
            $.ajax({
                type: "POST",
                contentType: "application/json; charset=utf-8",
                data: jsonData,
                url: gigyavalidateaccount + "?sitevalidation=true" + (setInactive ? "&setinactive=true" : ""),
                dataType: "text",
                async: false,
                success: function (jdata) {
                    result = jdata;
                    if (result == "false") {
                        if (setInactive) {
                            //do nothing, the server side logic will set inactive Gigya state
                        }
                        else {
                            $validationError = $('.gigya-profile-form:visible .gigya-error-msg[data-bound-to="data.accountId"]');
                            $validationError.css('visibility', 'visible').show();
                            $validationError.html($('.gigya-accountid-error').text());
                        }
                        isValid = false;
                    }
                    else {
                        if (setInactive) {
                            //do nothing, the server side logic will set inactive Gigya state
                        }
                        else {
                            $('.gigya-profile-form:visible .gigya-error-msg[data-bound-to="data.accountId"]').css('visibility', 'hidden').hide();
                            cpLoginUser(eventObj);
                        }
                        isValid = true;
                    }
                },
                error: function () {
                    isValid = false;
                }
            });
        }
    }
    return isValid;
}
// get current account information and pass it to the callback function showAccountInfo();
function getAccountInfo(callback) {
    gigya.accounts.getAccountInfo({
        callback: function (account) {
            globalAccountInfo = account;
            callback(account);
        },
        extraProfileFields: gigya_extraProfileFields,
        include: gigya_extraInclude
    });
}
// display results of getAccountInfo() call
function showAccountInfo(eventObj) {
    if ((eventObj.newUser == undefined || eventObj.newUser != true) && eventObj.data != undefined && eventObj.profile != undefined) {
        //redirect already logged in users on the login page and is not session already available
        if ($('#gigya-screensetcontainer').length > 0 && gigya_screen_id == "gigya-login-screen" && location.pathname.endsWith("/login")) {
            if ($('li.login_item_dashboard:visible').length <= 0) {
                loginAuthUser('', '', 'login', eventObj);
            }
            else {
                window.location.href = currentDomain + redirectDashboardURL;
            }
        }
    }
    if (isNewUserActive && (eventObj.isActive == undefined || eventObj.isActive == true || eventObj.newUser == true)) {
        //allow new user login, inactive state could be set via server-side code
        //so logout will happen on the next page refresh if needed
        setglobalAccountInfo(eventObj);
        if (isglobalAccountInfoValid(globalAccountInfo)) {
            updateProfileFields(globalAccountInfo);
        }
        else {
            notAuthorized(globalAccountInfo)
        }
    }
    else {
        if (eventObj.data != undefined && eventObj.profile != undefined) {
            console.log('Your account is inactive');
            logoutUserFromGigya(eventObj);
            logoutUserFromPortal(eventObj, true);
        }
    }
}
//logout user from portal
function logoutUserFromPortal(eventObj, pendingApproval) {
    var redirectUrl = loginURL;
    if (pendingApproval == true) {
        redirectUrl = pendingApprovalURL;
    }
    //deauthorize inactive user from this country and redirect to his locale
    $.ajax({
        type: "POST",
        contentType: "application/json; charset=utf-8",
        data: "",
        url: window.location.pathname == "/" ? currentDomain + "/index/signoutUserFromPortalOnly" : currentDomain + window.location.pathname + "/signoutUserFromPortalOnly",
        dataType: "json",
        success: function (jdata) {
            window.location.href = currentDomain + redirectUrl;
        },
        error: function () {
            window.location.href = currentDomain + redirectUrl;
        }
    });
}
//logout user from Gigya
function logoutUserFromGigya(eventObj) {
    gigya.accounts.logout();
}
function onBeforeLogin(eventObj) {
    return true;
}
//Edit Profile callback, ensure the latest account is used
function editProfileCallback(eventObj) {
    if (eventObj != undefined && eventObj.response != undefined && eventObj.response.errorCode !== 0) {
        return;
    }
    gigya.accounts.getAccountInfo({
        callback: function (account) {
            showAccountInfo(account);
        },
        extraProfileFields: gigya_extraProfileFields,
        include: gigya_extraInclude
    });
    //return true;
}
//after Screen Load callback
function afterScreenLoadCallback(eventObj) {
    if (gigya_screen_id == "gigya-signup-screen") {
        $('input[name="data.cultureCode"]').val(currentAuthLocale);//set culturecode from the CP locale
    }

    return true;
}
//after Login Screen Load callback
function onAfterLoginScreenLoad(eventObj) {
    $('.portal-register input').click(function () { window.location = registerURL });
}
//after Register field changed
function hideshowonFieldChanged(eventObj) {
    if (typeof gigya_hidedocid != 'undefined' && gigya_hidedocid == true) {
        $gigayform = $('form.gigya-register-form:visible')
        $conditionalElements = $gigayform.find('[data-condition]')
        if (eventObj.field == "data.Ihave" && eventObj.value == "DocCheckID") {
            $conditionalElements.hide();
            $gigayform.find("[data-condition*='DocCheckID']").show();
        }
        else {
            $conditionalElements.hide();
            $gigayform.find("[data-condition*='Zoetis customer number']").show();
        }
    }
}
//onLogout Gigya Event handler
function gigyaOnLogoutHandler(eventObj) {
    setglobalAccountInfo(eventObj);
    //update page fields after logout
    showAccountInfo(eventObj);
}
//onLogout mobile event handler
function onLogout(eventObj) {
    gigyaOnLogoutHandler(eventObj);
}
function gigyaAfterProfileScreenLoad(eventObj) {
    $('.delete-profile input').click(function () {
        var strconfirm = confirm("Are you sure you want to delete your profile?");
        if (strconfirm == true) {
            deleteProfile();
        }
    });
}
function gigyaAfterProfileSubmit(eventObj) {
    registerUMMUser(eventObj);
}
function deleteProfile() {
    var accountID = globalAccountInfo.UID;
    var ummId = globalAccountInfo.data.userId != undefined ? globalAccountInfo.data.userId : "";
    if (accountID != "") {
        jsonData = JSON.stringify({ userParamsData: { UserData: accountID, Status: "", ummId: ummId } });
        deleteUmmUserURL = profileURL.replace('profile', 'delete-profile');
        $.ajax({
            type: "POST",
            contentType: "application/json; charset=utf-8",
            data: jsonData,
            url: deleteUmmUserURL + "/deleteProfile",
            dataType: "json",
            success: function (jdata) {
                result = jdata.d.Status;
                logoutUserFromGigya();
                logoutUserFromPortal();
            },
            error: function () {
                return false;
            }
        });
    }
}
// display results of getAccountInfo() call
function notAuthorized(globalAccountInfo) {
    console.log("cplog - globalAccountInfo is emtpy or not valid");
}
// Set Default Global Info object
function setglobalAccountInfo(eventObj) {
    globalAccountInfo = eventObj;
}
// Set Default Global Info object
function isglobalAccountInfoValid(globalAccountInfo) {
    isValid = false;
    if (globalAccountInfo && globalAccountInfo.profile && globalAccountInfo.data) {
        isValid = true;
    }
    return isValid;
}
// display results of getAccountInfo() call
function updateProfileFields(globalAccountInfo) {
    if (isglobalAccountInfoValid(globalAccountInfo)) {
        firstName = "";
        lastName = "";
    }
}
$(document).ready(function () {
    WaitUntilUserDataIsReceived();

    if (gigya_screen_id == "gigya-reset-password-screen") {
        //redirect Reset Password to the required language page if needed
        var resetPasswordLangQS = getQSParameterByName("lang");
        if (resetPasswordLangQS != "") {
            pathname = location.pathname;
            currentqs = location.search;
            currentqs = currentqs.replace('&lang=' + resetPasswordLangQS, "");
            var currentpageURLArray = pathname.split('/');
            if (currentpageURLArray[1] && currentpageURLArray[1].length == 2) {
                pathname = pathname.replace("/" + currentpageURLArray[1] + "/", "/" + resetPasswordLangQS + "/");
            }
            if (pathname != location.pathname) {
                window.location.href = pathname + currentqs;
            }

        }
    }
    //Show/Hide elements for non authorized users
    if (isglobalAccountInfoValid(globalAccountInfo)) {
        //Show/Hide elements for authorized users
    }
    else {
        //Show/Hide elements for non authorized users
    }
    //add Gigya logout event to the logout links
    $('a[href*="logout"]').click(function () {
        logoutUserFromGigya();
    })
});
function getQSParameterByName(n) {
    n = n.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var i = new RegExp("[\\?&]" + n + "=([^&#]*)")
        , t = i.exec(location.search);
    return t == null ? "" : decodeURIComponent(t[1].replace(/\+/g, " "))
}
function getHashParameterByName(n) {
    n = n.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var i = new RegExp("[\\?&]" + n + "=([^&#]*)")
        , t = i.exec(location.hash);
    return t == null ? "" : decodeURIComponent(t[1].replace(/\+/g, " "))
}
function setCookie(n, t, i) {
    var r = new Date, u;
    r.setTime(r.getTime() + 864e5 * i);
    u = "expires=" + r.toGMTString();
    document.cookie = n + "=" + t + "; " + u
}
function getCookie(n) {
    for (var t, r = n + "=", u = document.cookie.split(";"), i = 0; i < u.length; i++)
        if (t = u[i].trim(),
            0 == t.indexOf(r))
            return t.substring(r.length, t.length);
    return ""
}
function deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01-Jan-70 00:00:01 GMT;';
}
// Use the browser's built-in functionality to quickly and safely escape the string
function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}
// UNSAFE with unsafe strings; only use on previously-escaped ones!
function unescapeHtml(escapedStr) {
    var div = document.createElement("div");
    div.innerHTML = escapedStr;
    var child = div.childNodes[0];
    return child ? child.nodeValue : "";
}
// fix timing issues not displaying proper logged in user info
var timerId = null, timeout = 10;
function WaitUntilUserDataIsReceived() {
    if (!!(timerId)) {
        if (timeout == 0) {
            return;
        }
        try {
            //if ($('.login-button').html()=="") {
            getAccountInfo(showAccountInfo);
            timeout = 0;
            return;
            //}
        } catch (e) {
        }
        timeout -= 1;
    }
    timerId = setTimeout("WaitUntilUserDataIsReceived()", 500);
    return;
}
$(document).ready(function () {
    if ($('#authholder').length <= 0) {
        $('#authholder_loggedin').show();
        $('#authholder_loggedin').prevAll(".widget-container").hide();
    }
});
var countrySites = {};
try {    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.co.zw";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-zw"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://zm.zoetis.com";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-zm"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.co.za";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-za"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://vn.zoetis.com";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["vi-vn"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.com.ve";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["es-ve"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.com.uy";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["es-uy"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetisus.com/";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "y";
        countrySites["es_us"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetisus.com";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "y";
        countrySites["en-us"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.co.uk";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-gb"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://ug.zoetis.com";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-ug"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.com.ua";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["ru"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.com.ua";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["uk-ua"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.co.tz";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-tz"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.tw";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["zh-tw"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.it";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-tr"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.com.tr";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["tr-tr"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://thailand.zoetis.com";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "y";
        countrySites["en-th"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.co.th";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "y";
        countrySites["th-th"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.si";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["sl-si"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.ru";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["ru-ru"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.rs";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["sr-rs"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.ro";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["ro-ro"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.com.py";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["es-py"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.com.pt";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["pt-pt"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.com.pl";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["pl-pl"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://ph.zoetis.com";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-ph"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.pe";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["es-pe"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.co.nz";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-nz"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.nl";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["nl-nl"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://ng.zoetis.com";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-ng"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.co.mz";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-mz"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.com.my";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-my"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.mx/";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "y";
        countrySites["en-mx"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.mx";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["es-mx"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.co.mw";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-mw"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.mu";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-mu"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://ma.zoetis.com";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["fr-ma"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.lv";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["lv-lv"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.lt";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["lt-lt"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://lr.zoetis.com";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-lr"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://live-laika.ztsaccess.com ";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-corp"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.kr";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["ko-kr"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://ke.zoetis.com";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-ke"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.jp";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "y";
        countrySites["en-jp"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.jp";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "y";
        countrySites["ja-jp"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.it";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-it"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.it";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["it-it"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.in";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-in"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "www.zoetis.co.il";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["he-il"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.ie";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-ie"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.ie";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-ie"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.ie/";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-ie"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.co.id";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["id-id"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.hu";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["hu-hu"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.hr";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["hr-hr"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.gr";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["el-gr"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.com.gh";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-gh"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://genetics.zoetis.com/australia";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en_ca_genetics"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["es_es_genetics"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://genetics.zoetisus.com/newzealand";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en_nz_genetics"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://genetics.zoetisus.com/australia";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en_au_genetics"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.fr";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["fr-fr"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.fi";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["fi-fi"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://et.zoetis.com";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-et"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.es";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["es-es"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://eg.zoetis.com";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["ar-eg"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.ee";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["et-ee"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.com.ec";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["es-ec"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "diagnostics.zoetis.com";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "y";
        countrySites["diagnostics-en"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["diagnostics"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.de";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-de"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.de";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["de-de"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.cz";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["cs-cz"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.cr";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["es-cr"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.com/";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-corp"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.com.co";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["es-co"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.cn";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-cn"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "www.zoetis.cn";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["zh-cn"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.cl/";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "y";
        countrySites["en-cl"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.cl";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["es-cl"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.ch";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["de-ch"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.ch";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["fr-ch"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.ca";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["fr-ca"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.ca";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-ca"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://zoetis.com.br/";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "y";
        countrySites["en-br"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.com.br";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["pt-br"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.com.bo";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["es-bo"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.bg";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["bg-bg"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.be";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["fr_benl"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.be";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["fr-be"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.be";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["nl-be"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.com.au";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-au"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.com.au";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["en-au"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://www.zoetis.at";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["de-at"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://ar.zoetis.com";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "y";
        countrySites["en-ar"] = countryConfig;    var countryConfig = {};
        countryConfig["siteDomain"] = "https://ar.zoetis.com";
        countryConfig["hideDashboardIfPendingProfileUpdate"] = "";
        countrySites["es-ar"] = countryConfig;    } catch (e) {
}
function loginAuthUser(code, returnUrlForm, action, event) {
    lockAuthWidget = false;
    if (!lockAuthWidget) {
        lockAuthWidget = true;
        if (event && event.parameters && event.parameters.AUTO_LOGIN == true && event.parameters.HOME_COUNTRY == false) {
            //if a user is already logged in to another country, then remove the login widget from the page and show the Dashboard/Profile/Logout links in the header
            //TBD no requirements for Gigya to handle this use case
            //umm config goes here
            //$('#authholder').hide();
            //$('#authholder_loggedin').show();
            //$('#authholder_loggedin').prevAll(".widget-container").hide();
            ////set server side to display header links
            //$.ajax({
            //    type: "POST",
            //    contentType: "application/json; charset=utf-8",
            //    data: "",
            //    url: window.location.pathname == "/" ? currentDomain + "/index.aspx/displayHeaderAuthLinks" : currentDomain + window.location.pathname + "/displayHeaderAuthLinks",
            //    dataType: "json",
            //    success: function (jdata) {
            //        $('.header-standard-nav ul').html($('#profileLinksForAuthControl_client').html());
            //        $('.header-standard-nav ul li').removeClass("hidden-lg");
            //    },
            //    error: function () {
            //    }
            //});
        }
        else {
            //otherwise go through the authorization process
            var offset = new Date().getTimezoneOffset();
            if (event.profile.country == null) {
                event.profile.country = currentAuthLocale.substring(3);
            }
            if (event.profile.culture == null) {
                event.profile.culture = currentAuthLocale;
            }
            var userData = JSON.stringify(event);
            var jsonText = JSON.stringify({ myParams: { Action: action, Result: "", UserCode: userData, Offset: offset } });
            var currentpageURL = window.location.href.split('?')[0];
            console.log("****PATH: " + window.location.pathname == "/" ? currentDomain + "/index/authorizeGigyaUser" : currentDomain + window.location.pathname + "/authorizeGigyaUser");
            $.ajax({
                type:"GET",// "POST",
                contentType: "application/json; charset=utf-8",
                //data: jsonText,
                url: "/data.json",//"https://stage.zoetis.be/fr/index/authorizeGigyaUser",
                dataType: "json",
                success: function (jdata) {
                    try {
                        localStorage.zoetisLoginUserDetails = JSON.stringify(jdata);//jdata.d.Result;
                    } catch (exception) { }
                    var result = jdata;//jdata.d.Result;
                    qs_returnURL = returnUrlForm != '' ? returnUrlForm : qs_returnURL;
                    if (currentAuthLocale != "en_US") {
                        qs_returnURL = qs_returnURL == "/" ? redirectDashboardURL : qs_returnURL;
                    }
                    //for DE redirect new users to autoapproved page
                    if (currentAuthLocale == "de_DE" && isNewUser) {
                        qs_returnURL = "/user-profile/approved";
                    }

                    //Logout in case user is null
                    logoutURLRedirect = typeof logoutURL == 'undefined' ? "/" : logoutURL
                    qs_returnURL = result == "null" ? logoutURLRedirect : qs_returnURL;
                    var userTypeValid = true;
                    if (typeof userTypeValidationResult != 'undefined') {
                        userTypeValid = userTypeValidationResult != true ? true : false;
                        qs_returnURL = typeof accessRestrictedURL == 'undefined' ? qs_returnURL : accessRestrictedURL
                    }
                    //Redirect to the user's locale site
                    newDomain = "";
                    try {
                        var userdata = $.parseJSON(result);
                        newLocale = userdata.culture.toLowerCase();
                        siteConfigObj = countrySites[newLocale];
                        if (siteConfigObj != undefined) {
                            newDomain = siteConfigObj["siteDomain"];
                        }
                    } catch (e) {
                    }

                    window.location.href = "/default.html";

                    //Use custom redirect for specific microsites
                    customMicrosite = false;
                    /*if (currentDomain == "https://stage-eid-jp.ztsaccess.com" || currentDomain == "https://www.excellenceindermatology.jp") {
                        customMicrosite = true;
                    }
                    if (customMicrosite) {
                        //stay on the same domain for the microsite
                        window.location.href = "/wco-submit?ReturnUrl=" + qs_returnURL + "&authuser=false";
                    }
                    else if (newDomain == "" || newDomain == currentDomain) {
                        //for the current country just redirect user to wco form submission page. user code = ""
                        window.location.href = "/wco-submit?ReturnUrl=" + qs_returnURL + "&authuser=false";
                    }
                    else {
                        //deauthorize user from this country and redirect to his locale
                        $.ajax({
                            type: "POST",
                            contentType: "application/json; charset=utf-8",
                            data: "",
                            url: window.location.pathname == "/" ? currentDomain + "/index/signoutUserFromPortalOnly" : currentDomain + window.location.pathname + "/signoutUserFromPortalOnly",
                            dataType: "json",
                            success: function (jdata) {
                                window.location.href = newDomain + "/wco-submit?ReturnUrl=" + qs_returnURL + "&authuser=true";
                            },
                            error: function () {
                                window.location.href = newDomain + "/wco-submit?ReturnUrl=" + qs_returnURL + "&authuser=true";
                            }
                        });
                    }*/
                },
                error: function () {
                    console.log("****error");
                }
            });
        }
    }
}
