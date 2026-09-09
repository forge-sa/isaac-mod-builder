# Isaac Mod Builder
The app that lets people who are far from coding express themselfs in modding

The app works just like constructor (not scratch-like, but easy) even your grandma can now make mods
## How it works?
- User enters values, names, uploads images
- These things are being written into a JSON
- JSON then is being converted into Lua
- After this, app detects path/s to the game whether the user is on Linux distro or Windows
- It installs mod and launch the game as soon as the user presses the button

## Important⚠️
- I, personally, did not test executable on windows, so feel free to report issues if any
- Linux AppImage will release as soon as I finish testing it
- You can build it yourself tho
```
npm install && npm run build
```