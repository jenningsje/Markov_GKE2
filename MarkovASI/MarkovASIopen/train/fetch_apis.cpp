#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <map>
#include <thread>
#include <mutex>
#include <chrono>
#include <curl/curl.h>
#include <queue>
#include <condition_variable>

using namespace std;

// Helper function to read file lines
vector<string> ReadAPIs(const string& filePath = "apis.txt") {
    vector<string> apis;
    ifstream file(filePath);
    if (!file.is_open()) {
        cerr << "Failed to open file: " << filePath << endl;
        return apis;
    }

    string line;
    while (getline(file, line)) {
        if (!line.empty()) {
            apis.push_back(line);
        }
    }
    return apis;
}

// Helper function for curl to write response to a string
size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    ((string*)userp)->append((char*)contents, size * nmemb);
    return size * nmemb;
}

// Thread-safe queue
template<typename T>
class SafeQueue {
    queue<T> q;
    mutex m;
    condition_variable cv;
public:
    void push(T value) {
        {
            lock_guard<mutex> lock(m);
            q.push(std::move(value));
        }
        cv.notify_one();
    }

    bool pop(T& value) {
        unique_lock<mutex> lock(m);
        cv.wait(lock, [this]{ return !q.empty(); });
        value = std::move(q.front());
        q.pop();
        return true;
    }

    bool empty() {
        lock_guard<mutex> lock(m);
        return q.empty();
    }
};

// Worker function
void FetchWorker(SafeQueue<string>& jobs, map<string, string>& results, mutex& mu) {
    CURL* curl = curl_easy_init();
    if (!curl) return;

    string url;
    while (!jobs.empty() && jobs.pop(url)) {
        string response;
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        curl_easy_setopt(curl, CURLOPT_TIMEOUT, 15L);

        CURLcode res = curl_easy_perform(curl);
        if (res != CURLE_OK) {
            cerr << "HTTP error for " << url << ": " << curl_easy_strerror(res) << endl;
            continue;
        }

        lock_guard<mutex> lock(mu);
        results[url] = response;
    }

    curl_easy_cleanup(curl);
}

// Fetch all APIs concurrently
map<string, string> FetchAllAPIs(const vector<string>& urls, int maxWorkers = 20) {
    map<string, string> results;
    mutex mu;
    SafeQueue<string> jobs;

    for (const auto& url : urls)
        jobs.push(url);

    vector<thread> workers;
    for (int i = 0; i < maxWorkers; ++i) {
        workers.emplace_back(FetchWorker, ref(jobs), ref(results), ref(mu));
    }

    for (auto& t : workers) {
        if (t.joinable()) t.join();
    }

    return results;
}

// Consolidated function
map<string, string> ConsolidatedData(const string& filePath = "apis.txt") {
    auto apis = ReadAPIs(filePath);
    if (apis.empty()) {
        cerr << "No APIs found in file" << endl;
        return {};
    }

    return FetchAllAPIs(apis, 20); // 20 concurrent workers
}

int main() {
    auto data = ConsolidatedData("apis.txt");
    for (const auto& [url, body] : data) {
        cout << url << " -> " << body.substr(0, 100) << "..." << endl; // print first 100 chars
    }
    return 0;
}
