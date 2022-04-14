import argparse
import fdt
import json
from os.path import exists


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--label", required=True,
                        help="flash partition label")
    parser.add_argument("--dts", required=True,
                        help="device tree file path")
    return parser.parse_args()


def not_found():
    print('None')


def main():
    args = parse_args()

    if not exists(args.dts):
        return not_found()

    f = open(args.dts, 'r')
    dts = fdt.parse_dts(f.read())
    f.close()

    chosen = dts.get_node('/chosen')
    flash_name = 'flash0'  # as default
    if chosen.exist_property('zephyr,flash'):
        property = chosen.get_property('zephyr,flash')
        flash_name = property.value[1:]

    soc = dts.get_node('/soc')
    flashs = [node for node in soc.nodes if node.name == 'flash:']
    if len(flashs) > 0:
        flash = flashs[0]
        flash_target = [
            node for node in flash.nodes if node.name[:-1] == flash_name]
        if len(flash_target) > 0:
            partitions = [
                node for node in flash_target[0].nodes if node.name == 'partitions']
            if len(partitions) > 0:
                target = [partition for partition in partitions[0].nodes if partition.get_property(
                    'label').value == args.label]
                if len(target) > 0:
                    target = target[0]
                    data = {
                        'reg': [target.get_property('reg')[0], target.get_property('reg')[1]],
                        'label': target.get_property('label').value
                    }
                    print(json.dumps(data))
                    return
    return not_found()


if __name__ == '__main__':
    main()
