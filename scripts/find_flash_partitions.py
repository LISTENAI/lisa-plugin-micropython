import argparse
import fdt
import json
from re import match
from os.path import exists, abspath
from os import environ


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dts", required=True, help="device tree file path")
    return parser.parse_args()


def not_found():
    print("None")


def match_size(size: str):
    if isinstance(size, str):
        # match M
        # define DT_SIZE_M(x) ((x) * 1024 * 1024)
        result = match(r"DT_SIZE_M\((\d+)\)$", size)
        if result:
            size = int(result.group(1)) * 1024 * 1024
        else:
            # match K
            # define DT_SIZE_K(x) ((x) * 1024)
            result = match(r"DT_SIZE_K\((\d+)\)$", size)
            size = int(result.group(1)) * 1024
    return size


def main():
    args = parse_args()

    if not exists(args.dts):
        return not_found()

    f = open(args.dts, "r")
    dts = fdt.parse_dts(f.read())
    f.close()

    dtsi_path = abspath(f"{environ['ZEPHYR_BASE']}/dts/arm/csk/csk6.dtsi")

    f = open(dtsi_path, "r")
    dtsi = fdt.parse_dts(f.read())
    f.close()

    flash0 = dtsi.get_node("/soc/flash:/flash0:")
    root = {
        "start": flash0.get_property("reg")[0],
        "size": match_size(flash0.get_property("reg")[1]),
        "partitions": [],
    }

    flash_name = "flash0"  # as default
    for path, nodes, props in dts.walk():
        if path == "/#include/chosen":
            for prop in props:
                if prop.name == "zephyr,flash":
                    flash_name = prop.value[1:]

    for node in dts.ext_nodes:
        if node.name == f"&{flash_name}":
            partitions = [node for node in node.nodes if node.name == "partitions"]
            if len(partitions) > 0:
                target_nodes = [partition for partition in partitions[0].nodes]

                for target in target_nodes:
                    root["partitions"].append(
                        {
                            "name": target.name[:-1],
                            "reg": [
                                target.get_property("reg")[0],
                                match_size(target.get_property("reg")[1]),
                            ],
                            "label": target.get_property("label").value,
                        }
                    )
                print(json.dumps(root))
                return
    return not_found()


if __name__ == "__main__":
    main()
