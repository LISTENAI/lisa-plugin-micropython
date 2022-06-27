$repoPath = $args[0]

Set-Location $repoPath
git pull

git submodule update --init --recursive --force --depth=1
