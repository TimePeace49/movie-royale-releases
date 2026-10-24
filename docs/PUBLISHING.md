# Publishing Movie Royale on GitHub (for Derek)

You do this once. After that, a new version takes about 3 clicks.

## One-time setup (about 15 minutes)

1. **Make a GitHub account** at [github.com/signup](https://github.com/signup) if you don't have one.
2. **Install GitHub Desktop** from [desktop.github.com](https://desktop.github.com) and sign in with that account. It's the easy, no-typing way to put files on GitHub.
3. In GitHub Desktop, click **File → New repository…**:
   - **Name:** `movie-royale`
   - **Local path:** anywhere you like (for example, Documents)
   - Leave "Initialize with README" **unticked**.
   - Click **Create repository**.
4. **Unzip `movie-royale-source.zip`** and copy everything inside the `movie-royale` folder into the new repository folder. In GitHub Desktop, **Repository → Show in Explorer** opens that folder. Make sure the hidden-looking `.github` folder and the `.gitignore` file come along too.
5. Back in GitHub Desktop you'll see all the files listed. At the bottom left, type a summary like `Movie Royale 1.1.8`, then click **Commit to main**.
6. Click **Publish repository**. **Untick "Keep this code private"** so other people can download it. Then click **Publish**.

Your page is now at `https://github.com/YOUR-NAME/movie-royale`.

## Making a release (what people download)

1. Open your repo page on github.com and click the **Actions** tab. If it asks, click **"I understand my workflows, go ahead and enable them"**.
2. Click **Build & release** on the left, then **Run workflow** on the right.
3. Type the version number, for example `1.2.0`. It must be higher than the last one.
4. Click the green **Run workflow** button.

GitHub builds the installer for you, which takes about 5 minutes, and publishes it under **Releases**. You don't need to build anything on your PC.

Every copy built this way already knows your repo. Anyone who installs it, you included, gets **"Update available — install?"** the next time a newer release is out.

> **Your own PC right now:** the copy you have installed (1.1.8) doesn't know your repo yet. Install the first release from your GitHub page once, or type `YOUR-NAME/movie-royale` in **Settings → Account & updates → Where updates come from**. After that it updates itself.

## Making a new version later

1. Put the new files into your repo folder by replacing the old ones.
2. In GitHub Desktop, **Commit to main**, then **Push origin**.
3. On github.com, go to **Actions → Build & release → Run workflow** and type the next version number.

Add a line to `CHANGELOG.md` each time so people know what changed.

## Good to know

- **Never** put your `data` folder on GitHub. It holds your Twitch, Discord and TMDB keys. The `.gitignore` file already keeps it out, as long as you don't delete it.
- The installer isn't code-signed, so people will see Windows' "Windows protected your PC" message. The README tells them to click **More info → Run anyway**.
- People report bugs and ideas in the **Issues** tab. Bug-report and idea forms are already set up.
