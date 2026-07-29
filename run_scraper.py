from bs4 import BeautifulSoup
import requests
import time
import json
import csv 
from alive_progress import alive_bar

HEADERS = {
        'Content-Type': 'application/json',
        'Retry-After': '60',
        'User-agent': 'Mozilla/5.0'
        }

def retry_request(url: str, retries: int, wait_time: int):
    content = ""
    for i in range(0, retries):
        content = requests.get(url, timeout=wait_time, headers=HEADERS)
        if content.status_code > 300:
            print(f"Error requesting {url} status code: {content.status_code}")
            print(f"Waiting for {wait_time} for next request")
            time.sleep(wait_time)
        else:
            return content
        if i == (retries - 1):
            return ""
    return content

def parjson(data: dict):
    classes = data['classes']
    class_list = []
    for room in classes:
        class_list.append(get_class_info(room))
    return class_list

def get_class_info(classdata: dict):
    class_info = dict()
    try: 
        facility = classdata['meetings'][0]
    except:
        print(classdata['index'], classdata['subject'], classdata['catalog_nbr'] )
        return  

    def clean_time(time_str):
        parts = time_str.split('.')
        if len(parts) != 4: 
            return 0
        hours = int(parts[0]) #casting 
        minutes = int(parts[1])/60
        return hours + minutes 
    
    #Safeguarding for No Room and TBA in data 
    if facility['facility_id'] == "NO ROOM" or facility['facility_id'] == "TBA" or facility['days'] == "TBA":
        return 
    
    class_info['facility_id'] = facility['facility_id']
    class_info['days'] = facility['days']
    class_info['start_time'] = clean_time(facility['start_time'])
    class_info['end_time'] = clean_time(facility['end_time'])
    return class_info

def data_to_csv(class_list):
    keys = class_list[0].keys()
    with open('qstp1.csv', 'w', newline='') as output_file:
        dict_writer = csv.DictWriter(output_file, keys)
        dict_writer.writeheader()
        dict_writer.writerows(class_list)

def get_json_data(acad_group):
    class_list = [] 
    url = "https://public.mybustudent.bu.edu/psc/BUPRD/EMPLOYEE/SA/s/WEBLIB_HCX_CM.H_CLASS_SEARCH.FieldFormula.IScript_ClassSearch?institution=BU001&term=2268&acad_group="+acad_group+"&page="
    result = retry_request(url,5,30)
    data = result.json() 
    total_page = int(data['pageCount'])
    with alive_bar(total_page) as bar: 
        for page in range(1,total_page+1):
            result = retry_request(url+str(page),5,30)
            data = result.json()
            classes = data['classes']
            #print(url+str(page))
            bar()
            for room in classes:
                if get_class_info(room):
                    class_list.append(get_class_info(room))
    with open(acad_group+".json", "w") as file:
        json.dump(class_list, file)
        file.close()
    return class_list    

def main():
    # url = "https://public.mybustudent.bu.edu/psc/BUPRD/EMPLOYEE/SA/s/WEBLIB_HCX_CM.H_CLASS_SEARCH.FieldFormula.IScript_ClassSearch?institution=BU001&term=2268&date_from=&date_thru=&subject=&subject_like=&catalog_nbr=&start_time_equals=&end_time_equals=&start_time_ge=&end_time_le=&days=&campus=&location=&x_acad_career=&acad_group=QST&rqmnt_designtn=&instruction_mode=&keyword=&class_nbr=&acad_org=&enrl_stat=&crse_attr=&crse_attr_value=&instructor_name=&instr_first_name=&session_code=&units=&trigger_search=&page=1"
    # result = retry_request(url,1,10)
    # print(result.json())
    #class_list = parjson(result.json())
    # data_to_csv(class_list)
    # doc = BeautifulSoup(result.content, "html.parser")
    # print(doc)
    
    building_list = [ 
        "CDS", 
        "QST", 
        "CGS", 
        "COM", 
        "ENG", 
        "CAS", 
        "MET", 
        "GRS", 
        "CFA", 
        "SAR", 
        "SDM", 
        "SHA", 
        "LAW", 
        "MED",
        "SPH",
        "SSW",
        "STH",
        "WED",
        ]

    for building in building_list: 
        get_json_data(building)
        
if __name__ == "__main__":
    main()