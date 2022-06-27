$gitRepo = $args[0]
$repoPath = $args[1]

git clone -c core.symlinks=true ${gitRepo} ${repoPath} --depth=1 --recursive
