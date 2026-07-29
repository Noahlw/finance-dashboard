# Apps Script web app runs as the accessing user

Status: accepted

The production web deployment will execute as the user accessing it and require a signed-in Google account. The app will resolve that identity against the active `Users` record and allow only `COMMITTEE` or `TREASURER`; anonymous and deployer-identity access are not valid authorization modes.
