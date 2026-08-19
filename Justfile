set dotenv-filename := "bazzzzite.env"
set dotenv-load

export image_name := env_var("IMAGE_NAME")
export repo_organization := env_var("REPO_ORGANIZATION")
export repo_name := env_var("REPO_NAME")
export image_desc := env_var("IMAGE_DESC")
export image_keywords := env_var("IMAGE_KEYWORDS")
export image_logo_url := env_var("IMAGE_LOGO_URL")
export default_tag := env_var("DEFAULT_TAG")
export bib_image := env_var("BIB_IMAGE")

alias build-vm := build-qcow2
alias rebuild-vm := rebuild-qcow2
alias run-vm := run-vm-qcow2

[private]
default:
    #!/usr/bin/env bash
    @just --list

check:
    #!/usr/bin/env bash
    find . -type f -name "*.just" -exec just --unstable --fmt --check -f {} \;
    just --unstable --fmt --check -f Justfile

fix:
    #!/usr/bin/env bash
    find . -type f -name "*.just" -exec just --unstable --fmt -f {} \;
    just --unstable --fmt -f Justfile || { exit 1; }

clean:
    #!/usr/bin/env bash
    touch _build
    find *_build* -exec rm -rf {} \;
    rm -f previous.manifest.json
    rm -f changelog.md
    rm -f output.env
    rm -rf output/

build $target_image=image_name $tag=default_tag:
    #!/usr/bin/env bash
    set -euox pipefail
    BUILD_ARGS=()
    LABELS=()
    if [[ -z "$(git status -s)" ]]; then
    GIT_SHA=$(git rev-parse --short HEAD)
    LABELS+=("--label" "io.artifacthub.package.readme-url=https://raw.githubusercontent.com/{{ repo_organization }}/{{ repo_name }}/${GIT_SHA}/README.md")
    LABELS+=("--label" "org.opencontainers.image.documentation=https://raw.githubusercontent.com/{{ repo_organization }}/{{ repo_name }}/${GIT_SHA}/README.md")
    LABELS+=("--label" "org.opencontainers.image.source=https://github.com/{{ repo_organization }}/{{ repo_name }}/blob/${GIT_SHA}/Containerfile")
    LABELS+=("--label" "org.opencontainers.image.url=https://github.com/{{ repo_organization }}/{{ repo_name }}/tree/${GIT_SHA}")
    LABELS+=("--label" "org.opencontainers.image.version={{ default_tag }}.$(date +%Y%m%d)-${GIT_SHA}")
    fi
    LABELS+=("--label" "io.artifacthub.package.deprecated=false")
    LABELS+=("--label" "io.artifacthub.package.keywords={{ image_keywords }}")
    LABELS+=("--label" "io.artifacthub.package.license=Apache-2.0")
    LABELS+=("--label" "io.artifacthub.package.logo-url={{ image_logo_url }}")
    LABELS+=("--label" "io.artifacthub.package.prerelease=false")
    LABELS+=("--label" "org.opencontainers.image.created=$(date -u +%Y\-%m\-%d\T%H\:%M\:%S\Z)")
    LABELS+=("--label" "org.opencontainers.image.description={{ image_desc }}")
    LABELS+=("--label" "org.opencontainers.image.title={{ image_name }}")
    LABELS+=("--label" "org.opencontainers.image.vendor={{ repo_organization }}")
    PODMAN_BUILD_ARGS=("${BUILD_ARGS[@]}" "${LABELS[@]}" --pull=newer --tag "${target_image}:${tag}" --file Containerfile)
    podman build "${PODMAN_BUILD_ARGS[@]}" .

publish $target_image=image_name $tag=default_tag: (build target_image tag)
    #!/usr/bin/env bash
    set -euox pipefail
    REGISTRY="ghcr.io/{{ repo_organization }}"
    podman tag "{{ target_image }}:{{ tag }}" "${REGISTRY}/{{ image_name }}:{{ tag }}"
    podman push "${REGISTRY}/{{ image_name }}:{{ tag }}"
    echo "Pushed ${REGISTRY}/{{ image_name }}:{{ tag }}"

ostree-rechunk $target_image=image_name $tag=default_tag:
    #!/usr/bin/env bash
    set -xeuo pipefail
    echo "Skipping ostree-rechunk due to runner disk space constraints"
    exit 0

generate-default-tag $tag=default_tag:
    #!/usr/bin/env bash
    echo "${tag}"

generate-build-tags $target_image=image_name $tag=default_tag:
    #!/usr/bin/env bash
    set -eoux pipefail
    DATE=$(date +%Y%m%d)
    BUILD_TAGS=()
    if [[ -z "$(git status -s)" ]]; then
    GIT_SHA=$(git rev-parse --short HEAD)
    BUILD_TAGS+=("${tag}-${GIT_SHA}")
    BUILD_TAGS+=("${tag}-${DATE}-${GIT_SHA}")
    BUILD_TAGS+=("${DATE}-${GIT_SHA}")
    fi
    BUILD_TAGS+=("${DATE}")
    BUILD_TAGS+=("${tag}")
    BUILD_TAGS+=("${tag}-${DATE}")
    echo "${BUILD_TAGS[@]}"

tag-images $target_image=image_name $tag=default_tag tags="":
    #!/usr/bin/env bash
    set -eoux pipefail
    IMAGE=$(podman inspect ${target_image}:${tag} | jq -r .[].Id)
    podman untag ${IMAGE}
    for tag in {{ tags }}; do
    podman tag $IMAGE "${target_image}:${tag}"
    done
    podman images

image_name $target_image=image_name:
    #!/usr/bin/env bash
    echo "${image_name}"

_rootful_load_image $target_image=image_name $tag=default_tag:
    #!/usr/bin/env bash
    set -eoux pipefail
    if [[ -n "${SUDO_USER:-}" || "${UID}" -eq "0" ]]; then
    echo "Already root or running under sudo, no need to load image from user podman."
    exit 0
    fi
    set +e
    resolved_tag=$(podman inspect -t image "${target_image}:${tag}" | jq -r '.[].RepoTags.[0]')
    return_code=$?
    set -e
    USER_IMG_ID=$(podman images --filter reference="${target_image}:${tag}" --format "'{{ '{{.ID}}' }}'")
    if [[ $return_code -eq 0 ]]; then
    ID=$(just sudoif podman images --filter reference="${target_image}:${tag}" --format "'{{ '{{.ID}}' }}'")
    if [[ "$ID" != "$USER_IMG_ID" ]]; then
    COPYTMP=$(mktemp -p "${PWD}" -d -t _build_podman_scp.XXXXXXXXXX)
    just sudoif TMPDIR=${COPYTMP} podman image scp ${UID}@localhost::"${target_image}:${tag}" root@localhost::"${target_image}:${tag}"
    rm -rf "${COPYTMP}"
    fi
    else
    just sudoif podman pull "${target_image}:${tag}"
    fi

_build-bib $target_image $tag $type $config: (_rootful_load_image target_image tag)
    #!/usr/bin/env bash
    set -euo pipefail
    args="--type ${type} "
    args+="--use-librepo=True "
    args+="--rootfs=btrfs"
    BUILDTMP=$(mktemp -p "${PWD}" -d -t _build-bib.XXXXXXXXXX)
    sudo podman run --rm -it --privileged --pull=newer --net=host --security-opt label=type:unconfined_t \
      -v $(pwd)/${config}:/config.toml:ro \
      -v $BUILDTMP:/output \
      -v /var/lib/containers/storage:/var/lib/containers/storage \
      "${bib_image}" ${args} "${target_image}:${tag}"
    mkdir -p output
    sudo mv -f $BUILDTMP/* output/
    sudo rmdir $BUILDTMP
    sudo chown -R $USER:$USER output/

_rebuild-bib $target_image $tag $type $config: (build target_image tag) && (_build-bib target_image tag type config)

build-qcow2 $target_image=("localhost/" + image_name) $tag=default_tag: && (_build-bib target_image tag "qcow2" "disk_config/disk.toml")
build-raw $target_image=("localhost/" + image_name) $tag=default_tag: && (_build-bib target_image tag "raw" "disk_config/disk.toml")
build-iso $target_image=("localhost/" + image_name) $tag=default_tag: && (_build-bib target_image tag "iso" "disk_config/iso.toml")
rebuild-qcow2 $target_image=("localhost/" + image_name) $tag=default_tag: && (_rebuild-bib target_image tag "qcow2" "disk_config/disk.toml")
rebuild-raw $target_image=("localhost/" + image_name) $tag=default_tag: && (_rebuild-bib target_image tag "raw" "disk_config/disk.toml")
rebuild-iso $target_image=("localhost/" + image_name) $tag=default_tag: && (_rebuild-bib target_image tag "iso" "disk_config/iso.toml")

_run-vm $target_image $tag $type $config:
    #!/usr/bin/env bash
    set -eoux pipefail
    image_file="output/${type}/disk.${type}"
    if [[ $type == iso ]]; then
    image_file="output/bootiso/install.iso"
    fi
    if [[ ! -f "${image_file}" ]]; then
    just "build-${type}" "$target_image" "$tag"
    fi
    port=8006
    while grep -q :${port} <<< $(ss -tunalp); do
    port=$(( port + 1 ))
    done
    echo "Using Port: ${port}"
    echo "Connect to http://localhost:${port}"
    run_args=()
    run_args+=(--rm --privileged --pull=newer)
    run_args+=(--publish "127.0.0.1:${port}:8006")
    run_args+=(--env "CPU_CORES=4")
    run_args+=(--env "RAM_SIZE=8G")
    run_args+=(--env "DISK_SIZE=64G")
    run_args+=(--env "TPM=Y")
    run_args+=(--env "GPU=Y")
    run_args+=(--device=/dev/kvm)
    run_args+=(--volume "${PWD}/${image_file}":"/boot.${type}")
    run_args+=(docker.io/qemux/qemu)
    (sleep 30 && xdg-open http://localhost:"$port") &
    podman run "${run_args[@]}"

run-vm-qcow2 $target_image=("localhost/" + image_name) $tag=default_tag: && (_run-vm target_image tag "qcow2" "disk_config/disk.toml")
run-vm-raw $target_image=("localhost/" + image_name) $tag=default_tag: && (_run-vm target_image tag "raw" "disk_config/disk.toml")
run-vm-iso $target_image=("localhost/" + image_name) $tag=default_tag: && (_run-vm target_image tag "iso" "disk_config/iso.toml")
spawn-vm rebuild="0" type="qcow2" ram="6G":
    #!/usr/bin/env bash
    set -eoux pipefail
    podman run --rm --privileged --pull=newer \
      --net=host \
      --env "CPU_CORES=4" \
      --env "RAM_SIZE=${ram}" \
      --device=/dev/kvm \
      -v "${PWD}/output/**/*.${type}":"/boot.${type}" \
      docker.io/qemux/qemu

lint:
    #!/usr/bin/env bash
    command -v shellcheck >/dev/null 2>&1 || { echo "shellcheck not found"; exit 1; }
    find . -iname "*.sh" -type f -exec shellcheck "{}" ';'
    find system_files/usr/libexec -maxdepth 1 -name 'bazzzzite-*' -type f -exec grep -qL '^#!.*python' {} \; -exec shellcheck {} \;

format:
    #!/usr/bin/env bash
    command -v shfmt >/dev/null 2>&1 || { echo "shfmt not found"; exit 1; }
    find . -iname "*.sh" -type f -exec shfmt --write "{}" ';'
